import { context, HTTPError, utils } from "@budibase/backend-core"
import {
  type RowActionPermissions,
  SEPARATOR,
  type TableRowActions,
  VirtualDocumentType,
} from "@budibase/types"
import { generateRowActionsID } from "../../../db/utils"
import sdk from "../.."

export interface StoredRowAction {
  id: string
  name: string
  permissions: RowActionPermissions
}

function buildDefaultPermissions(): RowActionPermissions {
  return {
    table: {
      runAllowed: true,
    },
    views: {},
  }
}

function normalizeName(name: string) {
  return name.trim()
}

function ensureUniqueAndThrow(doc: TableRowActions, name: string, existingRowActionId?: string) {
  const hasDuplicate = Object.entries(doc.actions ?? {}).some(
    ([id, action]) => action.name.toLowerCase() === name.toLowerCase() && id !== existingRowActionId
  )
  if (hasDuplicate) {
    throw new HTTPError("A row action with the same name already exists.", 409)
  }
}

async function getActionsDocOrCreate(tableId: string): Promise<TableRowActions> {
  const rowActionsId = generateRowActionsID(tableId)
  const db = context.getWorkspaceDB()
  const existing = await db.tryGet<TableRowActions>(rowActionsId)
  if (existing) {
    existing.actions ??= {}
    return existing
  }

  return {
    _id: rowActionsId,
    actions: {},
  }
}

export async function getAll(tableId: string): Promise<TableRowActions | undefined> {
  const db = context.getWorkspaceDB()
  const rowActionsId = generateRowActionsID(tableId)
  return await db.tryGet<TableRowActions>(rowActionsId)
}

export async function get(tableId: string, rowActionId: string): Promise<StoredRowAction> {
  const rowActions = await getAll(tableId)
  const rowAction = rowActions?.actions?.[rowActionId]
  if (!rowAction) {
    throw new HTTPError(`Row action '${rowActionId}' not found in '${tableId}'`, 400)
  }

  return {
    id: rowActionId,
    name: rowAction.name,
    permissions: rowAction.permissions ?? buildDefaultPermissions(),
  }
}

export async function create(
  tableId: string,
  rowAction: { name: string }
): Promise<StoredRowAction> {
  await sdk.tables.getTable(tableId)

  const normalizedName = normalizeName(rowAction.name || "")
  if (!normalizedName) {
    throw new HTTPError("Row action name is required.", 400)
  }

  const doc = await getActionsDocOrCreate(tableId)
  ensureUniqueAndThrow(doc, normalizedName)

  const rowActionId = `${VirtualDocumentType.ROW_ACTION}${SEPARATOR}${utils.newid()}`
  doc.actions[rowActionId] = {
    name: normalizedName,
    permissions: buildDefaultPermissions(),
  }

  const db = context.getWorkspaceDB()
  await db.put(doc)

  return {
    id: rowActionId,
    name: doc.actions[rowActionId].name,
    permissions: doc.actions[rowActionId].permissions,
  }
}

export async function remove(tableId: string, rowActionId: string): Promise<void> {
  const doc = await getAll(tableId)
  if (!doc?.actions?.[rowActionId]) {
    throw new HTTPError(`Row action '${rowActionId}' not found in '${tableId}'`, 400)
  }

  delete doc.actions[rowActionId]

  const db = context.getWorkspaceDB()
  if (!Object.keys(doc.actions).length && doc._rev) {
    await db.remove(doc._id, doc._rev)
    return
  }

  await db.put(doc)
}

export async function run(sourceId: string, rowActionId: string, rowId: string): Promise<void> {
  // Keep the trigger endpoint as a lightweight validity check.
  // Row actions are no longer automation-backed, so there is no server-side
  // execution beyond confirming the action exists for the source table.
  void rowId
  await get(sourceId, rowActionId)
}
