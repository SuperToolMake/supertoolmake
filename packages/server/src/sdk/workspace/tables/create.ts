import { Row, Table, WithoutDocMetadata } from "@budibase/types"

import * as external from "./external"
import { isExternal } from "./utils"
import { setPermissions } from "../permissions"
import { roles } from "@budibase/backend-core"

export async function create(
  table: WithoutDocMetadata<Table>,
  rows?: Row[],
  userId?: string
): Promise<Table> {
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
