import { context, HTTPError } from "@budibase/backend-core"
import { Row, TableSchema } from "@budibase/types"
import sdk from "../../../.."
import {
  csv,
  Format,
  json,
  jsonWithSchema,
} from "../../../../../api/controllers/table/exporters"
import { getRowParams, InternalTables } from "../../../../../db/utils"
import { breakRowIdField } from "../../../../../integrations/utils"
import { outputProcessing } from "../../../../../utilities/rowProcessor"
import { ExportRowsParams, ExportRowsResult } from "../types"

export async function exportRows(
  options: ExportRowsParams
): Promise<ExportRowsResult> {
  const {
    tableId,
    format,
    rowIds,
    columns,
    query,
    sort,
    sortOrder,
    delimiter,
    customHeaders,
  } = options
  const db = context.getWorkspaceDB()
  const table = await sdk.tables.getTable(tableId)

  let result: Row[] = []
  if (rowIds) {
    let response = (
      await db.allDocs<Row>({
        include_docs: true,
        keys: rowIds.map((row: string) => {
          const ids = breakRowIdField(row)
          if (ids.length > 1) {
            throw new HTTPError(
              "Export data does not support composite keys.",
              400
            )
          }
          return ids[0]
        }),
      })
    ).rows.map(row => row.doc!)

    result = await outputProcessing(table, response)
  } else {
    let searchResponse = await sdk.rows.search({
      tableId,
      query: query || {},
      sort,
      sortOrder,
    })
    result = searchResponse.rows
  }

  let rows: Row[] = []
  let schema = table.schema
  let headers

  result = trimFields(result, schema)

  // Filter data to only specified columns if required
  if (columns && columns.length) {
    for (let i = 0; i < result.length; i++) {
      rows[i] = {}
      for (let column of columns) {
        rows[i][column] = result[i][column]
      }
    }
    headers = columns
  } else {
    rows = result
  }

  let exportRows = sdk.rows.utils.cleanExportRows(
    rows,
    schema,
    format,
    columns,
    customHeaders
  )
  if (format === Format.CSV) {
    return {
      fileName: "export.csv",
      content: csv(
        headers ?? Object.keys(rows[0]),
        exportRows,
        delimiter,
        customHeaders
      ),
    }
  } else if (format === Format.JSON) {
    return {
      fileName: "export.json",
      content: json(exportRows),
    }
  } else if (format === Format.JSON_WITH_SCHEMA) {
    return {
      fileName: "export.json",
      content: jsonWithSchema(schema, exportRows),
    }
  } else {
    throw "Format not recognised"
  }
}

export async function fetch(tableId: string): Promise<Row[]> {
  const table = await sdk.tables.getTable(tableId)
  const rows = await fetchRaw(tableId)
  return await outputProcessing(table, rows)
}

export async function fetchRaw(
  tableId: string,
  limit?: number
): Promise<Row[]> {
  const db = context.getWorkspaceDB()
  let rows
  if (tableId === InternalTables.USER_METADATA) {
    rows = await sdk.users.fetchMetadata()
  } else {
    const response = await db.allDocs(
      getRowParams(tableId, null, {
        include_docs: true,
        limit,
      })
    )
    rows = response.rows.map(row => row.doc)
  }
  return rows as Row[]
}

function trimFields(rows: Row[], schema: TableSchema) {
  const allowedFields = ["_id", ...Object.keys(schema)]
  const result = rows.map(row =>
    Object.keys(row)
      .filter(key => allowedFields.includes(key))
      .reduce((acc, key) => ({ ...acc, [key]: row[key] }), {} as Row)
  )
  return result
}
