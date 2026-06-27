import { type Document, DocumentType } from "@supertoolmake/types"
import { DesignDocuments, SEPARATOR, USER_METADATA_PREFIX } from "../constants"
import { directCouchCall, directCouchQuery, getCouchInfo } from "./couch"
import { getDB } from "./db"

enum ReplicationDirection {
  TO_PRODUCTION = "toProduction",
  TO_DEV = "toDev",
}

interface ReplicateOpts {
  isCreation?: boolean
  tablesToSync?: string[] | "all"
  filter?: (doc: Document) => boolean | undefined
}

class Replication {
  sourceName: string
  targetName: string
  direction: ReplicationDirection | undefined

  constructor({ source, target }: { source: string; target: string }) {
    this.sourceName = source
    this.targetName = target
    if (
      source.startsWith(DocumentType.WORKSPACE_DEV) &&
      target.startsWith(DocumentType.WORKSPACE)
    ) {
      this.direction = ReplicationDirection.TO_PRODUCTION
    } else if (
      source.startsWith(DocumentType.WORKSPACE) &&
      target.startsWith(DocumentType.WORKSPACE_DEV)
    ) {
      this.direction = ReplicationDirection.TO_DEV
    }
  }

  private shouldKeepDoc(
    doc: { _id: string; _deleted?: boolean },
    opts: {
      isCreation?: boolean
      toDev: boolean
      syncAllTables: boolean
      tableSyncList?: string[]
      customFilter?: (doc: Document) => boolean
    }
  ): boolean {
    const { isCreation, toDev, syncAllTables, tableSyncList, customFilter } = opts
    const toProduction = !toDev

    const startsWithType = (id: string, docType: string) =>
      id && id.indexOf(docType + SEPARATOR) === 0

    const isData = (id: string) =>
      startsWithType(id, DocumentType.ROW) || startsWithType(id, DocumentType.LINK)

    if (doc._deleted) {
      return true
    }

    if (!isCreation && doc._id === DesignDocuments.MIGRATIONS) {
      return false
    }

    if (toDev && doc._id.indexOf("_design") === 0) {
      return false
    }

    if (doc._id && doc._id.indexOf(USER_METADATA_PREFIX) === 0) {
      return true
    }

    if (toProduction && !isCreation && startsWithType(doc._id, DocumentType.AUTO_COLUMN_STATE)) {
      return false
    }

    if (isData(doc._id)) {
      if (syncAllTables) {
        return true
      }
      if (tableSyncList) {
        for (const tableId of tableSyncList) {
          if (doc._id.indexOf(tableId) !== -1) {
            return true
          }
        }
      }
      return false
    }

    if (startsWithType(doc._id, DocumentType.AUTOMATION_LOG)) {
      return false
    }

    if (doc._id === DocumentType.WORKSPACE_METADATA) {
      return false
    }

    if (customFilter) {
      return !!customFilter(doc as Document)
    }

    return true
  }

  async replicate(opts: ReplicateOpts = {}) {
    const direction = this.direction
    const toDev = direction === ReplicationDirection.TO_DEV
    const isCreation = opts.isCreation
    const tablesToSync = opts.tablesToSync
    const customFilter = opts.filter

    let syncAllTables = false,
      tableSyncList: string[] | undefined
    if (typeof tablesToSync === "string" && tablesToSync === "all") {
      syncAllTables = true
    } else if (tablesToSync) {
      tableSyncList = tablesToSync
    }

    const { url, auth } = getCouchInfo()
    const parsed = new URL(url)
    const internalUrl = `http://${auth.username}:${auth.password}@${parsed.hostname}:5984`
    const replicateBody: any = {
      source: `${internalUrl}/${this.sourceName}`,
      target: `${internalUrl}/${this.targetName}`,
      create_target: true,
    }

    const response = await directCouchCall("_replicate", "POST", replicateBody)
    const result = await response.json()

    if (result.history?.find((h: any) => h.errors && h.errors.length > 0)) {
      throw new Error(`Replication failed: ${JSON.stringify(result.history)}`)
    }

    const filterOpts = { isCreation, toDev, syncAllTables, tableSyncList, customFilter }
    await this.cleanupTarget(filterOpts)

    return result
  }

  private async cleanupTarget(opts: {
    isCreation?: boolean
    toDev: boolean
    syncAllTables: boolean
    tableSyncList?: string[]
    customFilter?: (doc: Document) => boolean
  }) {
    const targetDb = getDB(this.targetName, { skip_setup: true })
    const allDocs = await targetDb.allDocs({ include_docs: true })
    const docsToDelete: { _id: string; _rev: string; _deleted: true }[] = []

    for (const row of allDocs.rows) {
      const doc = row.doc as any
      if (!doc || !doc._id) {
        continue
      }
      if (!this.shouldKeepDoc(doc, opts)) {
        docsToDelete.push({ _id: doc._id, _rev: doc._rev, _deleted: true })
      }
    }

    if (docsToDelete.length > 0) {
      await targetDb.bulkDocs(docsToDelete)
    }
  }

  async rollback() {
    const targetDb = getDB(this.targetName, { skip_setup: true })
    await targetDb.destroy()
    await directCouchQuery(`/${this.targetName}`, "PUT")
    await this.replicate()
  }
}

export default Replication
