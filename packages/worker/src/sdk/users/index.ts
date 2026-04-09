export * from "./users"

import { users } from "@supertoolmake/backend-core"
export const db = users.UserDB
export { users as core } from "@supertoolmake/backend-core"
