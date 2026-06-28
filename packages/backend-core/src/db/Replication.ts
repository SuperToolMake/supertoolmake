import { type AnyDocument, type Document, DocumentType } from "@supertoolmake/types"
import { DesignDocuments, SEPARATOR, USER_METADATA_PREFIX } from "../constants"
import { directCouchCall } from "./couch"

enum ReplicationDirection {
  TO_PRODUCTION = "toProduction",
  TO_DEV = "toDev",
}

const REPLICATION_BATCH_SIZE = 200

interface ReplicateOpts {
  isCreation?: boolean
  tablesToSync?: string[] | "all"
  filter?: (doc: Document) => boolean | undefined
  useAppFilters?: boolean
}

type ReplicationResponse = {
  ok: true
  docs_read: number
  docs_written: number
  doc_write_failures: number
  start_time: string
  end_time: string
  last_seq?: unknown
}

type ReplicationErrorResponse = {
  error?: string
  reason?: string
}

type ChangesResponse = {
  results?: Array<{
    id: string
    changes?: Array<{ rev: string }>
    deleted?: boolean
    doc?: AnyDocument
    seq?: unknown
  }>
  last_seq?: unknown
  pending?: number
}

type RevsDiffResponse = Record<string, { missing?: string[] }>

type BulkGetResponse = {
  results?: Array<{
    docs?: Array<{
      ok?: AnyDocument
      error?: ReplicationErrorResponse
    }>
  }>
}

type BulkDocsResponse = Array<{
  id?: string
  rev?: string
  ok?: boolean
  error?: string
  reason?: string
}>

async function readJson<T>(response: Awaited<ReturnType<typeof directCouchCall>>): Promise<T> {
  return (await response.json()) as T
}

async function throwReplicationError(
  response: Awaited<ReturnType<typeof directCouchCall>>,
  action: string
) {
  let error: ReplicationErrorResponse = {}
  try {
    error = await readJson<ReplicationErrorResponse>(response)
  } catch {}
  throw new Error(
    `Replication ${action} failed: ${error.error || response.status} - ${
      error.reason || response.statusText
    }`
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
    const startTime = new Date().toISOString()
    await this.ensureTarget()

    let since: unknown = 0
    let docsRead = 0
    let docsWritten = 0
    let docWriteFailures = 0
    let lastSeq: unknown
    let hasMoreChanges = true

    while (hasMoreChanges) {
      const changes = await this.getChanges(since)
      const results = changes.results || []
      if (!results.length) {
        lastSeq = changes.last_seq ?? lastSeq
        hasMoreChanges = false
        continue
      }

      const filteredChanges = results.filter((change) => this.shouldReplicateChange(change, opts))
      const revsDiff = await this.getMissingRevisions(filteredChanges)
      const docs = await this.getMissingDocs(revsDiff)

      docsRead += docs.length
      if (docs.length) {
        const response = await this.writeDocs(docs)
        docsWritten += response.filter((row) => row.ok).length
        docWriteFailures += response.filter((row) => row.error).length
      }

      since = changes.last_seq
      lastSeq = changes.last_seq
      hasMoreChanges = changes.pending !== 0 && changes.last_seq !== undefined
    }

    return {
      ok: true,
      docs_read: docsRead,
      docs_written: docsWritten,
      doc_write_failures: docWriteFailures,
      start_time: startTime,
      end_time: new Date().toISOString(),
      last_seq: lastSeq,
    } satisfies ReplicationResponse
  }

  private async ensureTarget() {
    const response = await directCouchCall(this.targetName, "PUT")
    if (![201, 202, 412].includes(response.status)) {
      await throwReplicationError(response, "target creation")
    }
  }

  private async getChanges(since: unknown): Promise<ChangesResponse> {
    const response = await directCouchCall(`${this.sourceName}/_changes`, "POST", {
      since,
      limit: REPLICATION_BATCH_SIZE,
      style: "all_docs",
      include_docs: true,
    })
    if (!response.ok) {
      await throwReplicationError(response, "changes read")
    }
    return readJson<ChangesResponse>(response)
  }

  private async getMissingRevisions(
    changes: ChangesResponse["results"]
  ): Promise<RevsDiffResponse> {
    const revsById: Record<string, string[]> = {}
    for (const change of changes || []) {
      const revs = change.changes?.map((change) => change.rev).filter(Boolean) || []
      if (revs.length) {
        revsById[change.id] = revs
      }
    }
    if (!Object.keys(revsById).length) {
      return {}
    }

    const response = await directCouchCall(`${this.targetName}/_revs_diff`, "POST", revsById)
    if (!response.ok) {
      await throwReplicationError(response, "revision diff")
    }
    return readJson<RevsDiffResponse>(response)
  }

  private async getMissingDocs(revsDiff: RevsDiffResponse): Promise<AnyDocument[]> {
    const docsToFetch = Object.entries(revsDiff).flatMap(([id, diff]) =>
      (diff.missing || []).map((rev) => ({ id, rev }))
    )
    if (!docsToFetch.length) {
      return []
    }

    const response = await directCouchCall(`${this.sourceName}/_bulk_get?revs=true`, "POST", {
      docs: docsToFetch,
    })
    if (!response.ok) {
      await throwReplicationError(response, "bulk get")
    }

    const body = await readJson<BulkGetResponse>(response)
    return (body.results || [])
      .flatMap((result) => result.docs || [])
      .map((result) => result.ok)
      .filter((doc): doc is AnyDocument => !!doc)
  }

  private async writeDocs(docs: AnyDocument[]): Promise<BulkDocsResponse> {
    const response = await directCouchCall(`${this.targetName}/_bulk_docs`, "POST", {
      docs,
      new_edits: false,
    })
    if (!response.ok) {
      await throwReplicationError(response, "bulk write")
    }
    return readJson<BulkDocsResponse>(response)
  }

  private shouldReplicateChange(
    change: NonNullable<ChangesResponse["results"]>[number],
    opts: ReplicateOpts
  ) {
    const doc = change.doc || ({ _id: change.id, _deleted: change.deleted } as Document)
    if (opts.useAppFilters === false) {
      return Boolean(doc._id)
    }
    return this.shouldReplicateDoc(doc, opts)
  }

  private shouldReplicateDoc(doc: Document, opts: ReplicateOpts) {
    if (!doc?._id) {
      return false
    }

    const isCreation = opts.isCreation
    const toDev = this.direction === ReplicationDirection.TO_DEV
    const toProduction = !toDev
    const startsWithType = (id: string, docType: string) =>
      id.indexOf(`${docType}${SEPARATOR}`) === 0
    const isData = (id: string) =>
      startsWithType(id, DocumentType.ROW) || startsWithType(id, DocumentType.LINK)

    let syncAllTables = false
    let tableSyncList: string[] | undefined
    if (opts.tablesToSync === "all") {
      syncAllTables = true
    } else if (opts.tablesToSync) {
      tableSyncList = opts.tablesToSync
    }

    if (doc._deleted) {
      return true
    }
    if (!isCreation && doc._id === DesignDocuments.MIGRATIONS) {
      return false
    }
    if (toDev && doc._id.indexOf("_design") === 0) {
      return false
    }
    if (doc._id.indexOf(USER_METADATA_PREFIX) === 0) {
      return true
    }
    if (toProduction && !isCreation && startsWithType(doc._id, DocumentType.AUTO_COLUMN_STATE)) {
      return false
    }
    if (isData(doc._id)) {
      if (syncAllTables) {
        return true
      }
      return Boolean(tableSyncList?.some((id) => doc._id?.includes(id)))
    }
    if (startsWithType(doc._id, DocumentType.AUTOMATION_LOG)) {
      return false
    }
    if (doc._id === DocumentType.WORKSPACE_METADATA) {
      return false
    }
    return opts.filter ? !!opts.filter(doc) : true
  }

  async rollback() {
    const response = await directCouchCall(this.targetName, "DELETE")
    if (![200, 202, 404].includes(response.status)) {
      await throwReplicationError(response, "target deletion")
    }
    await this.ensureTarget()
    await this.replicate({ useAppFilters: false })
  }
}

export default Replication
