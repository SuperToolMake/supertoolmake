import {
  EmptyFilterOption,
  Row,
  RowSearchParams,
  SearchResponse,
  SortOrder,
  Table,
} from "@budibase/types"
import { isExternalTableID } from "../../../integrations/utils"
import * as internal from "./search/internal"
import * as external from "./search/external"
import { ExportRowsParams, ExportRowsResult } from "./search/types"
import { dataFilters } from "@budibase/shared-core"
import sdk from "../../index"
import { searchInputMapping } from "./search/utils"
import { getQueryableFields, validateFilters } from "./queryUtils"
import { enrichSearchContext } from "../../../api/controllers/row/utils"

export { isValidFilter } from "../../../integrations/utils"

export interface ViewParams {
  calculation: string
  group: string
  field: string
}

function pickApi(tableId: any) {
  if (isExternalTableID(tableId)) {
    return external
  }
  return internal
}

export async function search(
  options: RowSearchParams,
  context?: Record<string, any>
): Promise<SearchResponse<Row>> {
  let source: Table
  let table: Table
  if (options.tableId) {
    source = await sdk.tables.getTable(options.tableId)
    table = source
  } else {
    throw new Error(`Must supply either a view ID or a table ID`)
  }

  const isExternalTable = isExternalTableID(table._id!)

  if (options.query) {
    const visibleFields = (options.fields || Object.keys(table.schema)).filter(
      field => table.schema[field]?.visible !== false
    )

    const queryableFields = await getQueryableFields(table, visibleFields)
    validateFilters(options.query, queryableFields)
  } else {
    options.query = {}
  }

  if (context) {
    options.query = await enrichSearchContext(options.query, context)
  }

  // need to make sure filters in correct shape before checking for view
  options = searchInputMapping(table, options)

  if (
    !dataFilters.hasFilters(options.query) &&
    options.query.onEmptyFilter === EmptyFilterOption.RETURN_NONE
  ) {
    return {
      rows: [],
    }
  }

  if (options.sortOrder) {
    options.sortOrder = options.sortOrder.toLowerCase() as SortOrder
  }

  let result: SearchResponse<Row>
  if (isExternalTable) {
    result = await external.search(options, source)
  } else {
    const rows = await internal.fetch(options.tableId)
    result = {
      rows,
    }
  }
  return result
}

export async function exportRows(
  options: ExportRowsParams
): Promise<ExportRowsResult> {
  return pickApi(options.tableId).exportRows(options)
}

export async function fetch(tableId: string): Promise<Row[]> {
  return pickApi(tableId).fetch(tableId)
}

export async function fetchRaw(
  tableId: string,
  limit?: number
): Promise<Row[]> {
  return pickApi(tableId).fetchRaw(tableId, limit)
}
