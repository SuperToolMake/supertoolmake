import { db as dbCore, tenancy } from "@supertoolmake/backend-core"

export async function checkAnyUserExists() {
  try {
    const db = tenancy.getGlobalDB()
    const users = await db.allDocs(
      dbCore.getGlobalUserParams(null, {
        include_docs: true,
        limit: 1,
      })
    )
    return users && users.rows.length >= 1
  } catch {
    throw new Error("Unable to retrieve user list")
  }
}
