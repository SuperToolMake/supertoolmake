import { HTTPError } from "@supertoolmake/backend-core"
import { IncludeRelationship, Operation, type Row, type Table } from "@supertoolmake/types"
import cloneDeep from "lodash/fp/cloneDeep"
import { handleRequest } from "../../../api/controllers/row/external"
import { breakRowIdField } from "../../../integrations/utils"
import { inputProcessing, outputProcessing } from "../../../utilities/rowProcessor"
import sdk from "../.."

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

export async function save(sourceId: string, inputs: Row, userId: string | undefined) {
  const tableId = sourceId
  const source: Table = await sdk.tables.getTable(tableId)

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
  const source: Table = await sdk.tables.getTable(tableId)
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
