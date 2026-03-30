import type {
  CreateRowActionRequest,
  RowActionPermissions,
  RowActionResponse,
  RowActionsResponse,
  RowActionTriggerRequest,
  RowActionTriggerResponse,
  Table,
  UserCtx,
} from "@budibase/types"
import sdk from "../../sdk"

async function getTable(ctx: UserCtx): Promise<Table> {
  const table = await sdk.tables.getTable(ctx.params.tableId)
  if (!table) {
    ctx.throw(404)
  }
  return table
}

function flattenAllowedSources(tableId: string, permissions: RowActionPermissions): string[] {
  const allowedSources: string[] = []
  if (permissions?.table?.runAllowed !== false) {
    allowedSources.push(tableId)
  }
  return allowedSources
}

export async function find(ctx: UserCtx<void, RowActionsResponse>) {
  const table = await getTable(ctx)
  const tableId = table._id!

  const rowActions = await sdk.rowActions.getAll(tableId)
  if (!rowActions) {
    ctx.body = { actions: {} }
    return
  }

  const actions = Object.entries(rowActions.actions || {}).reduce<
    Record<string, RowActionResponse>
  >((acc, [id, action]) => {
    acc[id] = {
      id,
      tableId,
      name: action.name,
      allowedSources: flattenAllowedSources(tableId, action.permissions),
    }
    return acc
  }, {})

  ctx.body = { actions }
}

export async function create(ctx: UserCtx<CreateRowActionRequest, RowActionResponse>) {
  const table = await getTable(ctx)
  const tableId = table._id!

  const created = await sdk.rowActions.create(tableId, {
    name: ctx.request.body?.name,
  })

  ctx.status = 201
  ctx.body = {
    id: created.id,
    tableId,
    name: created.name,
    allowedSources: flattenAllowedSources(tableId, created.permissions),
  }
}

export async function remove(ctx: UserCtx<void, void>) {
  const table = await getTable(ctx)
  await sdk.rowActions.remove(table._id!, ctx.params.rowActionId)
  ctx.status = 204
}

export async function run(ctx: UserCtx<RowActionTriggerRequest, RowActionTriggerResponse>) {
  const rowId = ctx.request.body?.rowId
  if (!rowId) {
    ctx.throw(400, "rowId is required")
  }

  await sdk.rowActions.run(ctx.params.sourceId, ctx.params.rowActionId, rowId)
  ctx.status = 200
  ctx.body = {
    message: "Row action triggered.",
  }
}
