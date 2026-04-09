import { context } from "@supertoolmake/backend-core"
import {
  type Database,
  INTERNAL_TABLE_SOURCE_ID,
  type RowValue,
  type Table,
  TableSourceType,
} from "@supertoolmake/types"
import { getRowParams, getTableParams, InternalTables } from "../../../db/utils"
import { breakExternalTableId, isExternalTableID, isSQL } from "../../../integrations/utils"
import sdk from "../.."
import datasources from "../datasources"

export async function processTable(table: Table): Promise<Table> {
  if (!table) {
    return table
  }

  table = { ...table }
  if (table._id && isExternalTableID(table._id)) {
    // Old created external tables might have a missing field name breaking some UI such as filters
    if (table.schema.id && !table.schema.id.name) {
      table.schema.id.name = "id"
    }
    return {
      ...table,
      type: "table",
      sourceType: TableSourceType.EXTERNAL,
    }
  } else {
    const processed: Table = {
      ...table,
      type: "table",
      primary: ["_id"], // internal tables must always use _id as primary key
      sourceId: table.sourceId || INTERNAL_TABLE_SOURCE_ID,
      sourceType: TableSourceType.INTERNAL,
      sql: true,
    }
    return processed
  }
}

export async function processTables(tables: Table[]): Promise<Table[]> {
  return await Promise.all(tables.map((table) => processTable(table)))
}

async function processEntities(tables: Record<string, Table>) {
  for (const key of Object.keys(tables)) {
    tables[key] = await processTable(tables[key])
  }
  return tables
}

export async function getAllInternalTables(db?: Database): Promise<Table[]> {
  if (!db) {
    db = context.getWorkspaceDB()
  }
  const internalTables = await db.allDocs<Table>(
    getTableParams(null, {
      include_docs: true,
    })
  )
  return await processTables(internalTables.rows.map((row) => row.doc!))
}

export async function getAllInternalTableIds(db?: Database): Promise<string[]> {
  const database = db || context.getWorkspaceDB()

  const { rows } = await database.allDocs<Table>(getTableParams(null, { include_docs: false }))

  const tableIds = rows.map(({ id }) => id)
  return tableIds
}

export async function listEmptyProductionTables(): Promise<string[]> {
  const internalTables = await getAllInternalTables()
  const emptyTableIds: string[] = []
  return context.doInWorkspaceContext(context.getProdWorkspaceId(), async () => {
    const db = context.getWorkspaceDB()
    const hasNonDeletedRows = async (tableId: string) => {
      const batchSize = 25
      let skip = 0

      while (true) {
        const { rows } = await db.allDocs<RowValue>(
          getRowParams(tableId, null, {
            include_docs: false,
            limit: batchSize,
            skip,
          })
        )
        if (rows.length === 0) {
          return false
        }

        const containsLiveRow = rows.some((row) => !row.value?.deleted)
        if (containsLiveRow) {
          return true
        }

        if (rows.length < batchSize) {
          return false
        }

        skip += batchSize
      }
    }

    for (const table of internalTables) {
      if (table._id === InternalTables.USER_METADATA || !table._id) {
        continue
      }
      const hasRows = await hasNonDeletedRows(table._id)
      if (!hasRows) {
        emptyTableIds.push(table._id)
      }
    }
    return emptyTableIds
  })
}

async function getAllExternalTables(): Promise<Table[]> {
  // this is all datasources, we'll need to filter out internal
  const datasources = await sdk.datasources.fetch({ enriched: true })

  const allEntities = datasources
    .filter((datasource) => datasource._id !== INTERNAL_TABLE_SOURCE_ID)
    .map((datasource) => datasource.entities)

  let final: Table[] = []
  for (const entities of allEntities) {
    if (entities) {
      final = final.concat(Object.values(entities))
    }
  }
  return await processTables(final)
}

export async function getExternalTable(datasourceId: string, tableName: string): Promise<Table> {
  const entities = await getExternalTablesInDatasource(datasourceId)
  if (!entities[tableName]) {
    throw new Error(`Unable to find table named "${tableName}"`)
  }
  const table = await processTable(entities[tableName])
  if (!table.sourceId) {
    table.sourceId = datasourceId
  }
  return table
}

export async function getTable(tableId: string): Promise<Table> {
  const db = context.getWorkspaceDB()
  let output: Table
  if (tableId && isExternalTableID(tableId)) {
    const { datasourceId, tableName } = breakExternalTableId(tableId)
    const datasource = await datasources.get(datasourceId)
    const table = await getExternalTable(datasourceId, tableName)
    output = { ...table, sql: isSQL(datasource) }
  } else {
    output = await db.get<Table>(tableId)
  }
  return await processTable(output)
}

export async function doesTableExist(tableId: string): Promise<boolean> {
  try {
    const table = await getTable(tableId)
    return Boolean(table)
  } catch {
    return false
  }
}

export async function getAllTables() {
  const [internal, external] = await Promise.all([getAllInternalTables(), getAllExternalTables()])
  return await processTables([...internal, ...external])
}

export async function getExternalTablesInDatasource(
  datasourceId: string
): Promise<Record<string, Table>> {
  const datasource = await datasources.get(datasourceId, { enriched: true })
  if (!datasource?.entities) {
    throw new Error("Datasource is not configured fully.")
  }
  return await processEntities(datasource.entities)
}

export async function getTables(tableIds: string[]): Promise<Table[]> {
  const externalTableIds = tableIds.filter((tableId) => isExternalTableID(tableId)),
    internalTableIds = tableIds.filter((tableId) => !isExternalTableID(tableId))
  let tables: Table[] = []
  if (externalTableIds.length) {
    const externalTables = await getAllExternalTables()
    tables = tables.concat(
      externalTables.filter((table) => externalTableIds.indexOf(table._id!) !== -1)
    )
  }
  if (internalTableIds.length) {
    const db = context.getWorkspaceDB()
    const internalTables = await db.getMultiple<Table>(internalTableIds, {
      allowMissing: true,
    })
    tables = tables.concat(internalTables)
  }
  return await processTables(tables)
}
