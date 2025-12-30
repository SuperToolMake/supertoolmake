import { UserCtx } from "@budibase/types"
import { Next } from "koa"
import {
  RoleAssignmentResponse,
  RoleUnAssignRequest,
  RoleAssignRequest,
} from "./mapping/types"
import { syncUsersAgainstWorkspaces } from "../../../sdk/workspace/workspaces/sync"

async function assign(
  ctx: UserCtx<RoleAssignRequest, RoleAssignmentResponse>,
  next: Next
) {
  const { userIds, ...assignmentProps } = ctx.request.body
  const workspaceIds = [
    assignmentProps.role?.appId,
    assignmentProps.appBuilder?.appId,
  ].filter((id): id is string => !!id)
  await syncUsersAgainstWorkspaces(userIds, workspaceIds)
  ctx.body = { data: { userIds } }
  await next()
}

async function unAssign(
  ctx: UserCtx<RoleUnAssignRequest, RoleAssignmentResponse>,
  next: Next
) {
  const { userIds, ...unAssignmentProps } = ctx.request.body
  const workspaceIds = [
    unAssignmentProps.role?.appId,
    unAssignmentProps.appBuilder?.appId,
  ].filter((id): id is string => !!id)
  await syncUsersAgainstWorkspaces(userIds, workspaceIds)
  ctx.body = { data: { userIds } }
  await next()
}

export default {
  assign,
  unAssign,
}
