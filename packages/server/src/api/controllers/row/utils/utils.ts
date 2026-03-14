import { sql } from "@budibase/backend-core"
import { processStringSync } from "@budibase/string-templates"
import {
  type Ctx,
  type DatasourcePlusQueryResponse,
  FieldType,
  type RelationshipsJson,
  type Row,
  type Table,
} from "@budibase/types"
import validateJs from "validate.js"
import * as utils from "../../../../db/utils"
import sdk from "../../../../sdk"
import { processDates } from "../../../../utilities/rowProcessor"
import { basicProcessing, generateIdForRow } from "./basic"
import { isKnexRows } from "./sqlUtils"

validateJs.extend(validateJs.validators.datetime, {
  parse: (value: string) => new Date(value).getTime(),
  // Input is a unix timestamp
  format: (value: string) => new Date(value).toISOString(),
})

export async function processRelationshipFields(
  table: Table,
  tables: Record<string, Table>,
  row: Row,
  relationships: RelationshipsJson[]
): Promise<Row> {
  for (const relationship of relationships) {
    const linkedTable = tables[relationship.tableName]
    if (!linkedTable || !row[relationship.column]) {
      continue
    }
    for (const key of Object.keys(row[relationship.column])) {
      let relatedRow: Row = row[relationship.column][key]
      // add this row as context for the relationship
      for (const col of Object.values(linkedTable.schema)) {
        if (col.type === FieldType.LINK && col.tableId === table._id) {
          relatedRow[col.name] = [row]
        }
      }
      // process additional types
      relatedRow = processDates(table, relatedRow)
      row[relationship.column][key] = relatedRow
    }
  }
  return row
}

export function getSourceId(ctx: Ctx): { tableId: string; viewId?: string } {
  // top priority, use the URL first
  if (ctx.params?.sourceId) {
    return { tableId: sql.utils.encodeTableId(ctx.params.sourceId) }
  }
  // now check for old way of specifying table ID
  if (ctx.params?.tableId) {
    return { tableId: sql.utils.encodeTableId(ctx.params.tableId) }
  }
  // check body for a table ID
  if (ctx.request.body?.tableId) {
    return { tableId: sql.utils.encodeTableId(ctx.request.body.tableId) }
  }
  throw new Error("Unable to find table ID in request")
}

export async function getSource(ctx: Ctx): Promise<Table> {
  const { tableId } = getSourceId(ctx)
  return sdk.tables.getTable(tableId)
}

export async function getTableFromSource(source: Table) {
  return source
}

function fixBooleanFields(row: Row, table: Table) {
  for (const col of Object.values(table.schema)) {
    if (col.type === FieldType.BOOLEAN) {
      if (row[col.name] === 1) {
        row[col.name] = true
      } else if (row[col.name] === 0) {
        row[col.name] = false
      }
    }
  }
  return row
}

export function getSourceFields(source: Table): string[] {
  const fields = Object.entries(source.schema)
    .filter(([_, field]) => field.visible !== false)
    .map(([columnName]) => columnName)
  return fields
}

export async function sqlOutputProcessing(
  rows: DatasourcePlusQueryResponse,
  source: Table,
  tables: Record<string, Table>,
  relationships: RelationshipsJson[]
): Promise<Row[]> {
  if (!isKnexRows(rows)) {
    return []
  }

  const table: Table = source
  const isCalculationView = false

  const processedRows: Row[] = []
  for (let row of rows) {
    if (row._id == null && !isCalculationView) {
      row._id = generateIdForRow(row, table)
    }

    row = await basicProcessing({
      row,
      source,
      tables: Object.values(tables),
      isLinked: false,
    })
    row = fixBooleanFields(row, table)
    row = await processRelationshipFields(table, tables, row, relationships)
    processedRows.push(row)
  }

  return processDates(table, processedRows)
}

export function isUserMetadataTable(tableId: string) {
  return tableId === utils.InternalTables.USER_METADATA
}

export async function enrichArrayContext(
  fields: Record<string, unknown>[],
  inputs = {},
  helpers = true
): Promise<Record<string, any>[]> {
  const map: Record<string, any> = {}
  for (const index in fields) {
    map[index] = fields[index]
  }
  const output = await enrichSearchContext(map, inputs, helpers)
  const outputArray = []
  for (const [key, value] of Object.entries(output)) {
    outputArray[parseInt(key)] = value
  }
  return outputArray
}

export async function enrichSearchContext(
  fields: Record<string, any> | undefined,
  inputs = {},
  helpers = true
): Promise<Record<string, any>> {
  const enrichedQuery: Record<string, unknown> = {}
  if (!fields || !inputs) {
    return enrichedQuery
  }
  const parameters = { ...inputs }

  if (Array.isArray(fields)) {
    return enrichArrayContext(fields, inputs, helpers)
  }

  // enrich the fields with dynamic parameters
  for (const key of Object.keys(fields)) {
    if (fields[key] == null) {
      enrichedQuery[key] = null
      continue
    }
    if (typeof fields[key] === "object") {
      // enrich nested fields object
      enrichedQuery[key] = await enrichSearchContext(fields[key], parameters, helpers)
    } else if (typeof fields[key] === "string") {
      // enrich string value as normal
      enrichedQuery[key] = processStringSync(fields[key], parameters, {
        noEscaping: true,
        noHelpers: !helpers,
        escapeNewlines: true,
      })
    } else {
      enrichedQuery[key] = fields[key]
    }
  }

  return enrichedQuery
}
