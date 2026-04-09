import { context } from "@supertoolmake/backend-core"
import type { RenameColumn, Table } from "@supertoolmake/types"
import { cloneDeep } from "lodash"
import type { DocumentInsertResponse } from "nano"
import { isExternalTableID } from "../../../integrations/utils"
import sdk from "../../index"
import * as external from "./external"
import { isExternal } from "./utils"

export * as external from "./external"

export async function saveTable(table: Table): Promise<Table> {
  const db = context.getWorkspaceDB()
  let resp: DocumentInsertResponse
  if (isExternalTableID(table._id!)) {
    const datasource = await sdk.datasources.get(table.sourceId!)
    datasource.entities![table.name] = table
    resp = await db.put(datasource)
  } else {
    resp = await db.put(table)
  }

  const tableClone = cloneDeep(table)
  tableClone._rev = resp.rev
  return tableClone
}

export async function update(table: Table, renaming?: RenameColumn) {
  const tableId = table._id
  if (isExternal({ table })) {
    const datasourceId = table.sourceId!
    await external.save(datasourceId, table, { tableId, renaming })
  } else {
    throw Error("Can only update external tables")
  }
}
