import { context } from "@supertoolmake/backend-core"

import { isTableIdOrExternalTableId } from "@supertoolmake/shared-core"
import type { DatabaseQueryOpts, LinkDocument, LinkDocumentValue } from "@supertoolmake/types"
import { getQueryIndex, ViewName } from "../../../db/utils"

export async function fetch(tableId: string): Promise<LinkDocumentValue[]> {
  if (!isTableIdOrExternalTableId(tableId)) {
    throw new Error(`Invalid tableId: ${tableId}`)
  }

  const db = context.getWorkspaceDB()
  const params: DatabaseQueryOpts = {
    startkey: [tableId],
    endkey: [tableId, {}],
  }
  const linkRows = (await db.query(getQueryIndex(ViewName.LINK), params)).rows
  return linkRows.map((row) => row.value as LinkDocumentValue)
}

export async function fetchWithDocument(tableId: string): Promise<LinkDocument[]> {
  if (!isTableIdOrExternalTableId(tableId)) {
    throw new Error(`Invalid tableId: ${tableId}`)
  }

  const db = context.getWorkspaceDB()
  const params: DatabaseQueryOpts = {
    startkey: [tableId],
    endkey: [tableId, {}],
    include_docs: true,
  }
  const linkRows = (await db.query(getQueryIndex(ViewName.LINK), params)).rows
  return linkRows.map((row) => row.doc as LinkDocument)
}
