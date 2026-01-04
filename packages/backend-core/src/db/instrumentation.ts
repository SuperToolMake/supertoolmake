import Nano, {
  DocumentDestroyResponse,
  DocumentListParams,
  DocumentInsertResponse,
  DocumentBulkResponse,
  OkResponse,
} from "nano"
import {
  AllDocsResponse,
  AnyDocument,
  Database,
  DatabaseDumpOpts,
  DatabasePutOpts,
  DatabaseQueryOpts,
  Document,
  RowValue,
} from "@budibase/types"
import { Writable } from "stream"

export class DDInstrumentedDatabase implements Database {
  constructor(private readonly db: Database) {}

  get name(): string {
    return this.db.name
  }

  exists(docId?: string): Promise<boolean> {
    if (docId) {
      return this.db.exists(docId)
    }
    return this.db.exists()
  }

  get<T extends Document>(id?: string | undefined): Promise<T> {
    return this.db.get(id)
  }

  tryGet<T extends Document>(id?: string | undefined): Promise<T | undefined> {
    return this.db.tryGet<T>(id)
  }

  getMultiple<T extends Document>(
    ids?: string[],
    opts?: { allowMissing?: boolean | undefined } | undefined
  ): Promise<T[]> {
    return this.db.getMultiple<T>(ids, opts)
  }

  remove(idOrDoc: Document): Promise<DocumentDestroyResponse>
  remove(idOrDoc: string, rev?: string): Promise<DocumentDestroyResponse>
  remove(
    idOrDoc: string | Document,
    rev?: string
  ): Promise<DocumentDestroyResponse> {
    const isDocument = typeof idOrDoc === "object"
    const id = isDocument ? idOrDoc._id! : idOrDoc
    rev = isDocument ? idOrDoc._rev : rev
    return this.db.remove(id, rev)
  }

  bulkRemove(
    documents: Document[],
    opts?: { silenceErrors?: boolean }
  ): Promise<void> {
    return this.db.bulkRemove(documents, opts)
  }

  put<T extends AnyDocument>(
    document: T,
    opts?: DatabasePutOpts & { returnDoc: true }
  ): Promise<DocumentInsertResponse & { doc: T }>
  put<T extends AnyDocument>(
    document: T,
    opts?: DatabasePutOpts & { returnDoc?: false }
  ): Promise<DocumentInsertResponse>
  put<T extends AnyDocument>(
    document: T,
    opts?: DatabasePutOpts
  ): Promise<DocumentInsertResponse | (DocumentInsertResponse & { doc: T })> {
    return this.db.put(document, opts as any)
  }

  bulkDocs(documents: AnyDocument[]): Promise<DocumentBulkResponse[]> {
    return this.db.bulkDocs(documents)
  }

  async find<T extends Document>(
    params: Nano.MangoQuery
  ): Promise<Nano.MangoResponse<T>> {
    const resp = await this.db.find<T>(params)
    return resp
  }

  allDocs<T extends Document | RowValue>(
    params: DocumentListParams
  ): Promise<AllDocsResponse<T>> {
    return this.db.allDocs<T>(params)
  }

  query<T extends Document>(
    viewName: string,
    params: DatabaseQueryOpts
  ): Promise<AllDocsResponse<T>> {
    return this.db.query<T>(viewName, params)
  }

  destroy(): Promise<OkResponse> {
    return this.db.destroy()
  }

  compact(): Promise<OkResponse> {
    return this.db.compact()
  }

  dump(
    stream: Writable,
    opts?: DatabaseDumpOpts | undefined
  ): ReturnType<Database["dump"]> {
    return this.db.dump(stream, opts)
  }

  load(...args: Parameters<Database["load"]>): ReturnType<Database["load"]> {
    return this.db.load(...args)
  }

  createIndex(
    ...args: Parameters<Database["createIndex"]>
  ): ReturnType<Database["createIndex"]> {
    return this.db.createIndex(...args)
  }

  deleteIndex(
    ...args: Parameters<Database["deleteIndex"]>
  ): ReturnType<Database["deleteIndex"]> {
    return this.db.deleteIndex(...args)
  }

  getIndexes(
    ...args: Parameters<Database["getIndexes"]>
  ): ReturnType<Database["getIndexes"]> {
    return this.db.getIndexes(...args)
  }
}
