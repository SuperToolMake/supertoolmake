import { getGlobalDBName } from "../context"
import { getDB } from "../db/db"

export function getTenantDB(tenantId: string) {
  return getDB(getGlobalDBName(tenantId))
}
