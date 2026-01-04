import { context, db as dbCore } from "@budibase/backend-core"
import { Database, Row } from "@budibase/types"
import { getRowParams } from "../../../db/utils"
import * as external from "./external"

export async function getAllInternalRows(appId?: string) {
  let db: Database
  if (appId) {
    db = dbCore.getDB(appId)
  } else {
    db = context.getWorkspaceDB()
  }
  const response = await db.allDocs(
    getRowParams(null, null, {
      include_docs: true,
    })
  )
  return response.rows.map(row => row.doc) as Row[]
}

function pickApi() {
  return external
}

export async function save(
  sourceId: string,
  row: Row,
  userId: string | undefined
) {
  return pickApi().save(sourceId, row, userId)
}

export async function find(sourceId: string, rowId: string) {
  return pickApi().find(sourceId, rowId)
}
