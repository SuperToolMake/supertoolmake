import { context, db, HTTPError, logging } from "@budibase/backend-core"
import chunk from "lodash/chunk"
import {
  AnyDocument,
  DocumentType,
  INTERNAL_TABLE_SOURCE_ID,
  Row,
  WithDocMetadata,
  prefixed,
  ResourceType,
  Screen,
  Table,
  UsedResource,
} from "@budibase/types"
import sdk from "../.."
import { getRowParams } from "../../../db/utils"
import { DocumentListParams } from "nano"

export async function getResourcesInfo(): Promise<
  Record<string, { dependencies: UsedResource[] }>
> {
  const workspaceApps = await sdk.workspaceApps.fetch()

  const dependencies: Record<string, { dependencies: UsedResource[] }> = {}
  interface BaseSearchTarget {
    id: string
    idToSearch: string
    name: string
    type: ResourceType
    extraDependencies?: {
      id: string
      name: string
      type: ResourceType
    }[]
  }
  const baseSearchTargets: BaseSearchTarget[] = []

  const internalTables = await sdk.tables.getAllInternalTables()

  baseSearchTargets.push(
    ...internalTables.map(table => ({
      id: table._id!,
      idToSearch: table._id!,
      name: table.name!,
      type: ResourceType.TABLE,
    }))
  )

  const datasources = await sdk.datasources.fetch()
  baseSearchTargets.push(
    ...datasources
      .filter(d => d._id !== INTERNAL_TABLE_SOURCE_ID)
      .map<BaseSearchTarget>(datasource => ({
        id: datasource._id!,
        idToSearch: datasource._id!,
        name: datasource.name!,
        type: ResourceType.DATASOURCE,
      }))
  )

  const queries = await sdk.queries.fetch()
  baseSearchTargets.push(
    ...queries.map<BaseSearchTarget>(query => ({
      id: query._id!,
      idToSearch: query._id!,
      name: query.name!,
      type: ResourceType.QUERY,
    }))
  )

  const searchForUsages = (
    forResource: string,
    possibleUsages: AnyDocument
  ) => {
    const json = JSON.stringify(possibleUsages)
    dependencies[forResource] ??= { dependencies: [] }
    for (const search of baseSearchTargets) {
      if (
        json.includes(search.idToSearch) &&
        !dependencies[forResource].dependencies.find(
          resource => resource.id === search.id
        )
      ) {
        dependencies[forResource].dependencies.push({
          id: search.id,
          name: search.name,
          type: search.type,
        })

        const toAdd = [
          ...(search.extraDependencies || []),
          ...(dependencies[search.id]?.dependencies || []),
        ].filter(
          ({ id }) =>
            !dependencies[forResource].dependencies.some(r => r.id === id)
        )
        dependencies[forResource].dependencies.push(...toAdd)
      }
    }
  }

  // Search in tables
  for (const table of internalTables) {
    searchForUsages(table._id!, table)
  }

  // Search in queries
  for (const query of queries) {
    searchForUsages(query._id!, query)
  }

  // Search in workspace app screens
  const screens = await sdk.screens.fetch()
  const workspaceAppScreens: Record<string, Screen[]> = {}

  for (const screen of screens) {
    if (!screen.workspaceAppId) {
      continue
    }
    if (!workspaceAppScreens[screen.workspaceAppId]) {
      workspaceAppScreens[screen.workspaceAppId] = []
    }
    workspaceAppScreens[screen.workspaceAppId].push(screen)
  }

  for (const workspaceApp of workspaceApps) {
    const screens = workspaceAppScreens[workspaceApp._id!] || []
    dependencies[workspaceApp._id!] ??= { dependencies: [] }
    dependencies[workspaceApp._id!].dependencies.push(
      ...screens.map(s => ({
        id: s._id!,
        name: s.name!,
        type: ResourceType.SCREEN,
      }))
    )

    for (const screen of screens) {
      searchForUsages(workspaceApp._id!, screen)
    }
  }

  return dependencies
}

async function getDestinationDb(toWorkspace: string) {
  const destinationDb = db.getDB(db.getDevWorkspaceID(toWorkspace), {
    skip_setup: true,
  })
  if (!(await destinationDb.exists())) {
    throw new HTTPError("Destination workspace does not exist", 400)
  }

  return destinationDb
}

const resourceTypeIdPrefixes: Record<ResourceType, string> = {
  [ResourceType.DATASOURCE]: prefixed(DocumentType.DATASOURCE),
  [ResourceType.TABLE]: prefixed(DocumentType.TABLE),
  [ResourceType.ROW_ACTION]: prefixed(DocumentType.ROW_ACTIONS),
  [ResourceType.QUERY]: prefixed(DocumentType.QUERY),
  [ResourceType.WORKSPACE_APP]: prefixed(DocumentType.WORKSPACE_APP),
  [ResourceType.SCREEN]: prefixed(DocumentType.SCREEN),
}

function getResourceType(id: string): ResourceType | undefined {
  const type = Object.entries(resourceTypeIdPrefixes).find(([_, idPrefix]) =>
    id.startsWith(idPrefix)
  )?.[0] as ResourceType | undefined
  return type
}

function isTable(doc: AnyDocument): doc is WithDocMetadata<Table> {
  if (!doc._id) {
    return false
  }
  const type = getResourceType(doc._id)
  return type === ResourceType.TABLE
}

const ROW_PAGE_SIZE = 1000
const ROW_CHUNK_SIZE = 250
const ROW_WRITE_RETRIES = 3
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchTableRowsPage(
  tableId: string,
  startAfter?: string
): Promise<{
  rows: Row[]
  nextStartAfter?: string
}> {
  const sourceDb = context.getWorkspaceDB()
  const params: Partial<DocumentListParams> = {
    include_docs: true,
    limit: ROW_PAGE_SIZE + (startAfter ? 1 : 0),
  }
  if (startAfter) {
    params.startkey = startAfter
    params.skip = 1
  }
  const response = await sourceDb.allDocs<Row>(
    getRowParams(tableId, null, params)
  )

  const docs = response.rows
    .map(row => row.doc)
    .filter((doc): doc is Row => !!doc)
  const rows = docs.length > ROW_PAGE_SIZE ? docs.slice(0, ROW_PAGE_SIZE) : docs
  const nextStartAfter =
    rows.length === ROW_PAGE_SIZE ? rows[rows.length - 1]._id : undefined
  return { rows, nextStartAfter }
}

async function bulkInsertRows(
  destinationDb: ReturnType<typeof db.getDB>,
  docs: AnyDocument[]
) {
  const chunks = chunk(docs, ROW_CHUNK_SIZE)
  for (const chunk of chunks) {
    let pending = chunk
    let attempts = 0
    while (pending.length && attempts < ROW_WRITE_RETRIES) {
      attempts++
      const response = (await destinationDb.bulkDocs(pending)) as Array<{
        error?: unknown
      }>
      const failed: AnyDocument[] = []
      response.forEach((result, idx) => {
        if (result.error) {
          failed.push(pending[idx])
        }
      })

      if (!failed.length) {
        break
      }

      if (attempts >= ROW_WRITE_RETRIES) {
        throw new Error(
          `Failed to copy ${failed.length} row(s) after ${ROW_WRITE_RETRIES} attempts.`
        )
      }

      await delay(attempts * 250)
      pending = failed
    }
  }
}

async function duplicateInternalTableRows(
  tables: WithDocMetadata<Table>[],
  destinationDb: ReturnType<typeof db.getDB>,
  fromWorkspace: string
) {
  if (!tables.length) {
    return
  }

  for (const table of tables) {
    if (table.sourceId !== INTERNAL_TABLE_SOURCE_ID) {
      continue
    }

    const destinationHasRows = !!(
      await destinationDb.allDocs(
        getRowParams(table._id!, null, {
          include_docs: false,
          limit: 1,
        })
      )
    ).rows.length
    if (destinationHasRows) {
      logging.logWarn(
        "Resource duplication: destination table already contains rows, skipping copy",
        { tableId: table._id, tableName: table.name }
      )
      continue
    }
    let startAfter: string | undefined = undefined

    do {
      const { rows, nextStartAfter } = await fetchTableRowsPage(
        table._id!,
        startAfter
      )
      startAfter = nextStartAfter

      if (!rows.length) {
        break
      }

      const sanitizedRows: AnyDocument[] = []
      for (const row of rows) {
        const sanitizedRow: AnyDocument = {
          ...row,
          fromWorkspace,
        }
        delete sanitizedRow._rev
        delete sanitizedRow.createdAt
        delete sanitizedRow.updatedAt
        sanitizedRows.push(sanitizedRow)
      }

      await bulkInsertRows(destinationDb, sanitizedRows)
    } while (startAfter)
  }
}

export async function duplicateResourcesToWorkspace(
  resources: string[],
  toWorkspace: string,
  options?: {
    copyRows?: boolean
  }
) {
  resources = Array.from(new Set(resources).keys())

  const destinationDb = await getDestinationDb(toWorkspace)

  const existingDocuments = await destinationDb.getMultiple<AnyDocument>(
    resources,
    {
      allowMissing: true,
    }
  )
  const existingIds = new Set(existingDocuments.map(doc => doc._id))
  const toCopy = resources.filter(id => !existingIds.has(id))

  const documentToCopy = await context
    .getWorkspaceDB()
    .getMultiple<AnyDocument>(resources, {
      allowMissing: false,
    })
  const docsToInsert = documentToCopy.filter(
    doc => doc._id && toCopy.includes(doc._id)
  )

  const fromWorkspace = context.getWorkspaceId()
  if (!fromWorkspace) {
    throw new Error("Could not get workspaceId")
  }
  if (docsToInsert.length) {
    await destinationDb.bulkDocs(
      docsToInsert.map<AnyDocument>(doc => {
        const sanitizedDoc: AnyDocument = { ...doc, fromWorkspace }
        delete sanitizedDoc._rev
        delete sanitizedDoc.createdAt
        delete sanitizedDoc.updatedAt
        return sanitizedDoc
      })
    )
  }

  if (options?.copyRows ?? true) {
    await duplicateInternalTableRows(
      documentToCopy.filter(isTable),
      destinationDb,
      fromWorkspace
    )
  }
}
