import { HTTPError } from "@budibase/backend-core"
import { IncludeRelationship, Operation, Row, Table } from "@budibase/types"
import cloneDeep from "lodash/fp/cloneDeep"
import sdk from "../.."
import { handleRequest } from "../../../api/controllers/row/external"
import { breakRowIdField } from "../../../integrations/utils"
import {
  inputProcessing,
  outputProcessing,
} from "../../../utilities/rowProcessor"

export async function getRow(
  sourceId: string | Table,
  rowId: string,
  opts?: { relationships?: boolean }
) {
  let source: Table
  if (typeof sourceId === "string") {
    source = await sdk.tables.getTable(sourceId)
  } else {
    source = sourceId
  }
  const response = await handleRequest(Operation.READ, source, {
    id: breakRowIdField(rowId),
    includeSqlRelationships: opts?.relationships
      ? IncludeRelationship.INCLUDE
      : IncludeRelationship.EXCLUDE,
  })
  const rows = response?.rows || []
  return rows[0]
}

export async function save(
  sourceId: string,
  inputs: Row,
  userId: string | undefined
) {
  const tableId = sourceId
  let source: Table = await sdk.tables.getTable(tableId)

  const row = await inputProcessing(userId, cloneDeep(source), inputs)

  const validateResult = await sdk.rows.utils.validate({
    row,
    source,
  })
  if (!validateResult.valid) {
    throw { validation: validateResult.errors }
  }

  const response = await handleRequest(Operation.CREATE, source, {
    row,
  })

  const rowId = response.row._id
  if (rowId) {
    const row = await getRow(source, rowId, {
      relationships: true,
    })
    return {
      ...response,
      row: await outputProcessing(source, row, {
        preserveLinks: true,
        squash: true,
      }),
    }
  } else {
    return response
  }
}

export async function find(tableId: string, rowId: string): Promise<Row> {
  let source: Table = await sdk.tables.getTable(tableId)
  const row = await getRow(source, rowId, {
    relationships: true,
  })

  if (!row) {
    throw new HTTPError("Row not found", 404)
  }

  // Preserving links, as the outputProcessing does not support external rows
  // yet and we don't need it in this use case
  return await outputProcessing(source, row, {
    squash: true,
    preserveLinks: true,
  })
}
