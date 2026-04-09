import { context } from "@supertoolmake/backend-core"
import type { User } from "@supertoolmake/types"

export function get(userId: string) {
  const db = context.getWorkspaceDB()
  return db.get<User>(userId)
}
