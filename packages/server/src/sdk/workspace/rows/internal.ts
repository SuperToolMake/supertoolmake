import { context, db } from "@budibase/backend-core"
import { Row, Table } from "@budibase/types"
import sdk from "../.."
import { finaliseRow } from "../../../api/controllers/row/staticFormula"
import { InternalTables } from "../../../db/utils"
import {
  inputProcessing,
  outputProcessing,
} from "../../../utilities/rowProcessor"
import { getFullUser } from "../../../utilities/users"
import { getSource } from "./utils"

export async function save(
  tableId: string,
  inputs: Row,
  userId: string | undefined,
  opts?: { updateAIColumns: boolean }
) {
  inputs.tableId = tableId

  let source: Table
  let table: Table
  source = await sdk.tables.getTable(tableId)
  table = source

  if (!inputs._rev && !inputs._id) {
    inputs._id = db.generateRowID(inputs.tableId!)
  }

  let row = await inputProcessing(userId, source, inputs)

  const validateResult = await sdk.rows.utils.validate({
    row,
    source,
  })

  if (!validateResult.valid) {
    throw { validation: validateResult.errors }
  }

  return finaliseRow(source, row, {
    updateFormula: true,
    updateAIColumns: opts?.updateAIColumns || true,
  })
}

export async function find(sourceId: string, rowId: string): Promise<Row> {
  const source = await getSource(sourceId)
  return await outputProcessing(source, await findRow(sourceId, rowId), {
    squash: true,
  })
}

export async function findRow(sourceId: string, rowId: string) {
  const tableId = sourceId
  const db = context.getWorkspaceDB()
  let row: Row
  // TODO remove special user case in future
  if (tableId === InternalTables.USER_METADATA) {
    row = await getFullUser(rowId)
  } else {
    row = await db.get(rowId)
  }
  if (row.tableId !== tableId) {
    throw "Supplied tableId does not match the rows tableId"
  }
  return row
}
