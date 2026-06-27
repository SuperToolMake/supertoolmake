import { type Document, DocumentType } from "@supertoolmake/types"
import { DesignDocuments, SEPARATOR, USER_METADATA_PREFIX } from "../constants"
import { newid } from "../docIds/newid"
import { directCouchCall, directCouchQuery } from "./couch"
import { getDB } from "./db"

const FILTER_DESIGN_ID = `_design/${newid()}`

enum ReplicationDirection {
  TO_PRODUCTION = "toProduction",
  TO_DEV = "toDev",
}

interface ReplicateOpts {
  isCreation?: boolean
  tablesToSync?: string[] | "all"
  filter?: (doc: Document) => boolean
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

    let filterFunction: string
    if (customFilter) {
      const filterBody = customFilter.toString().replace(/\n/g, " ").replace(/"/g, '\\"')
      filterFunction = `function (doc, req) {
        var fn = (${filterBody});
        return fn(doc) ? 1 : 0;
      }`
    } else {
      filterFunction = `function (doc, req) {
        if (!req.query) { req.query = {}; }
        var isCreation = req.query.isCreation === 'true';
        var toDev = req.query.toDev === 'true';
        var syncAllTables = req.query.syncAllTables === 'true';
        var tableSyncList = req.query.tableSyncList ? req.query.tableSyncList.split(',') : [];

        function startsWithID(_id, documentType) {
          return _id && _id.indexOf(documentType + '${SEPARATOR}') === 0;
        }

        function isData(_id) {
          return startsWithID(_id, '${DocumentType.ROW}') || startsWithID(_id, '${DocumentType.LINK}');
        }

        if (!isCreation && doc._id === '${DesignDocuments.MIGRATIONS}') {
          return false;
        }
        if (toDev && doc._id.indexOf('_design') === 0) {
          return false;
        }
        if (doc._deleted) {
          return true;
        }
        if (startsWithID(doc._id, '${USER_METADATA_PREFIX}')) {
          return true;
        }
        if ('${direction}' === '${ReplicationDirection.TO_PRODUCTION}' && !isCreation && startsWithID(doc._id, '${DocumentType.AUTO_COLUMN_STATE}')) {
          return false;
        }
        if (isData(doc._id)) {
          if (syncAllTables) { return true; }
          for (var i = 0; i < tableSyncList.length; i++) {
            if (doc._id.indexOf(tableSyncList[i]) !== -1) { return true; }
          }
          return false;
        }
        if (startsWithID(doc._id, '${DocumentType.AUTOMATION_LOG}')) {
          return false;
        }
        if (doc._id === '${DocumentType.WORKSPACE_METADATA}') {
          return false;
        }
        return true;
      }`
    }

    const sourceDb = getDB(this.sourceName, { skip_setup: true })
    try {
      await sourceDb.put({
        _id: FILTER_DESIGN_ID,
        filters: {
          replication: filterFunction,
        },
      } as any)
    } catch (err: any) {
      if (err.status !== 409) {
        throw err
      }
      const existing = await sourceDb.get<any>(FILTER_DESIGN_ID)
      await sourceDb.put({
        _id: FILTER_DESIGN_ID,
        _rev: existing._rev,
        filters: {
          replication: filterFunction,
        },
      } as any)
    }

    try {
      const queryParams: Record<string, string> = {}
      if (!customFilter) {
        queryParams.isCreation = String(!!isCreation)
        queryParams.toDev = String(!!toDev)
        queryParams.syncAllTables = String(!!syncAllTables)
        if (tableSyncList) {
          queryParams.tableSyncList = tableSyncList.join(",")
        }
      }

      const replicateBody: any = {
        source: this.sourceName,
        target: this.targetName,
        filter: `${FILTER_DESIGN_ID}/replication`,
        query_params: queryParams,
        create_target: true,
      }

      const response = await directCouchCall("_replicate", "POST", replicateBody)
      const result = await response.json()

      if (result.history?.find((h: any) => h.errors && h.errors.length > 0)) {
        throw new Error(`Replication failed: ${JSON.stringify(result.history)}`)
      }

      return result
    } finally {
      try {
        const existing = await sourceDb.get<any>(FILTER_DESIGN_ID)
        await sourceDb.remove(FILTER_DESIGN_ID, existing._rev)
      } catch {}
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
