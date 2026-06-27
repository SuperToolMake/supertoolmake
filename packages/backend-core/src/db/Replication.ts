import { type Document, DocumentType } from "@supertoolmake/types"
import { DesignDocuments, SEPARATOR, USER_METADATA_PREFIX } from "../constants"
import { newid } from "../docIds/newid"
import { directCouchCall, directCouchQuery, getCouchInfo } from "./couch"
import { getDB } from "./db"

const FILTER_NAME = "replication"
const FILTER_DESIGN_NAME = "super_replication"
const FILTER_DESIGN_ID = `_design/${FILTER_DESIGN_NAME}`

enum ReplicationDirection {
  TO_PRODUCTION = "toProduction",
  TO_DEV = "toDev",
}

interface ReplicateOpts {
  isCreation?: boolean
  tablesToSync?: string[] | "all"
  filter?: (doc: Document) => boolean | undefined
}

type ReplicationFilterDoc = Document & {
  filters: Record<string, string>
}

type ReplicationResponse = {
  history?: Array<{
    errors?: unknown[]
  }>
}

type ReplicationBody = {
  source: string
  target: string
  filter: string
  query_params: Record<string, string>
  create_target: boolean
}

function isNotFoundError(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    ("status" in err || "statusCode" in err) &&
    ((err as { status?: unknown }).status === 404 ||
      (err as { statusCode?: unknown }).statusCode === 404)
  )
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

    const filterDesignName = customFilter ? `replication_${newid()}` : FILTER_DESIGN_NAME
    const filterDesignId = customFilter ? `_design/${filterDesignName}` : FILTER_DESIGN_ID
    const sourceDb = getDB(this.sourceName, { skip_setup: true })
    const filterFunction = this.buildFilterFunction({
      filterDesignId,
      customFilter,
    })

    await this.ensureFilter(sourceDb, filterDesignId, filterFunction)

    try {
      const queryParams: Record<string, string> = {
        isCreation: String(!!isCreation),
        toDev: String(!!toDev),
        syncAllTables: String(!!syncAllTables),
      }
      if (tableSyncList) {
        queryParams.tableSyncList = tableSyncList.join(",")
      }

      const { url, auth } = getCouchInfo()
      const parsed = new URL(url)
      const internalUrl = `http://${auth.username}:${auth.password}@${parsed.hostname}:5984`
      const replicateBody: ReplicationBody = {
        source: `${internalUrl}/${this.sourceName}`,
        target: `${internalUrl}/${this.targetName}`,
        filter: `${filterDesignName}/${FILTER_NAME}`,
        query_params: queryParams,
        create_target: true,
      }

      const response = await directCouchCall("_replicate", "POST", replicateBody)
      const result = (await response.json()) as ReplicationResponse

      if (result.history?.find((h) => h.errors && h.errors.length > 0)) {
        throw new Error(`Replication failed: ${JSON.stringify(result.history)}`)
      }

      return result
    } finally {
      if (customFilter) {
        try {
          const existing = await sourceDb.get<ReplicationFilterDoc>(filterDesignId)
          await sourceDb.remove(filterDesignId, existing._rev)
        } catch {}
      }
    }
  }

  private async ensureFilter(
    sourceDb: ReturnType<typeof getDB>,
    filterDesignId: string,
    filterFunction: string
  ) {
    const doc = {
      _id: filterDesignId,
      filters: {
        [FILTER_NAME]: filterFunction,
      },
    } satisfies ReplicationFilterDoc
    try {
      const existing = await sourceDb.get<ReplicationFilterDoc>(filterDesignId)
      if (existing.filters?.[FILTER_NAME] === filterFunction) {
        return
      }
      await sourceDb.put({
        ...doc,
        _rev: existing._rev,
      })
    } catch (err: unknown) {
      if (!isNotFoundError(err)) {
        throw err
      }
      await sourceDb.put(doc)
    }
  }

  private buildFilterFunction({
    filterDesignId,
    customFilter,
  }: {
    filterDesignId: string
    customFilter?: (doc: Document) => boolean | undefined
  }) {
    const customFilterSource = customFilter ? customFilter.toString() : undefined

    return `function (doc, req) {
      if (!doc || !doc._id) {
        return false;
      }
      if (doc._id === ${JSON.stringify(filterDesignId)}) {
        return false;
      }
      if (!req.query) {
        req.query = {};
      }

      var isCreation = req.query.isCreation === "true";
      var toDev = req.query.toDev === "true";
      var syncAllTables = req.query.syncAllTables === "true";
      var tableSyncList = req.query.tableSyncList ? req.query.tableSyncList.split(",") : [];
      var toProduction = !toDev;

      function startsWithType(id, docType) {
        return id && id.indexOf(docType + ${JSON.stringify(SEPARATOR)}) === 0;
      }

      function isData(id) {
        return startsWithType(id, ${JSON.stringify(DocumentType.ROW)}) ||
          startsWithType(id, ${JSON.stringify(DocumentType.LINK)});
      }

      if (doc._deleted) {
        return true;
      }

      if (!isCreation && doc._id === ${JSON.stringify(DesignDocuments.MIGRATIONS)}) {
        return false;
      }

      if (toDev && doc._id.indexOf("_design") === 0) {
        return false;
      }

      if (doc._id.indexOf(${JSON.stringify(USER_METADATA_PREFIX)}) === 0) {
        return true;
      }

      if (
        toProduction &&
        !isCreation &&
        startsWithType(doc._id, ${JSON.stringify(DocumentType.AUTO_COLUMN_STATE)})
      ) {
        return false;
      }

      if (isData(doc._id)) {
        if (syncAllTables) {
          return true;
        }
        for (var i = 0; i < tableSyncList.length; i++) {
          if (doc._id.indexOf(tableSyncList[i]) !== -1) {
            return true;
          }
        }
        return false;
      }

      if (startsWithType(doc._id, ${JSON.stringify(DocumentType.AUTOMATION_LOG)})) {
        return false;
      }

      if (doc._id === ${JSON.stringify(DocumentType.WORKSPACE_METADATA)}) {
        return false;
      }

      ${
        customFilterSource
          ? `var customFilter = (${customFilterSource});
      return !!customFilter(doc);`
          : "return true;"
      }
    }`
  }

  async rollback() {
    const targetDb = getDB(this.targetName, { skip_setup: true })
    await targetDb.destroy()
    await directCouchQuery(`/${this.targetName}`, "PUT")
    await this.replicate()
  }
}

export default Replication
