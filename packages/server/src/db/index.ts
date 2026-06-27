import { db as dbCore } from "@supertoolmake/backend-core"

export * from "./utils"

export function init() {
  dbCore.CouchDatabase.init()
}
