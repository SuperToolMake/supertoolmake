import { roles } from "@supertoolmake/backend-core"
import type { Table, WithoutDocMetadata } from "@supertoolmake/types"
import { setPermissions } from "../permissions"
import * as external from "./external"
import { isExternal } from "./utils"

export async function create(table: WithoutDocMetadata<Table>): Promise<Table> {
  let createdTable: Table
  if (isExternal({ table })) {
    createdTable = await external.create(table)
  } else {
    throw Error("Can only create external tables")
  }

  await setPermissions(createdTable._id!, {
    writeRole: roles.BUILTIN_ROLE_IDS.ADMIN,
    readRole: roles.BUILTIN_ROLE_IDS.ADMIN,
  })

  return createdTable
}
