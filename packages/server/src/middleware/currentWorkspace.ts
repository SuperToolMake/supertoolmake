import { constants, context, roles, users, utils } from "@supertoolmake/backend-core"
import type { ContextUser, UserCtx } from "@supertoolmake/types"
import type { Middleware, Next } from "koa"
import { generateUserMetadataID, isDevWorkspaceID } from "../db/utils"
import { getCachedSelf } from "../utilities/global"
import { isApiKey, isBrowser } from "./utils"

export const currentWorkspaceMiddleware = (async (ctx: UserCtx, next: Next) => {
  // try to get the workspaceID from the request
  const requestWorkspaceId = await utils.getWorkspaceIdFromCtx(ctx)
  if (!requestWorkspaceId) {
    return next()
  }

  // deny access to application preview
  if (isBrowser(ctx) && !isApiKey(ctx)) {
    if (isDevWorkspaceID(requestWorkspaceId) && !users.isBuilder(ctx.user, requestWorkspaceId)) {
      return ctx.redirect("/")
    }
  }

  let workspaceId: string | undefined,
    roleId = roles.BUILTIN_ROLE_IDS.PUBLIC
  if (!ctx.user?._id) {
    // not logged in, try to set a cookie for public apps
    workspaceId = requestWorkspaceId
  } else if (requestWorkspaceId != null) {
    // Different Workspace ID means cookie needs reset, or if the same public user has logged in
    const globalUser = await getCachedSelf(ctx, requestWorkspaceId)
    workspaceId = requestWorkspaceId
    // retrieving global user gets the right role
    roleId = globalUser.roleId || roleId

    // Allow builders to specify their role via a header
    const isBuilder = users.isBuilder(globalUser, workspaceId)
    const isDev = workspaceId && isDevWorkspaceID(workspaceId)
    const roleHeader = ctx.request && (ctx.request.headers[constants.Header.PREVIEW_ROLE] as string)
    if (isBuilder && isDev && roleHeader) {
      roleId = roleHeader
      // Delete admin and builder flags so that the specified role is honoured
      ctx.user = users.removePortalUserPermissions(ctx.user) as ContextUser
    }
  }

  // nothing more to do
  if (!workspaceId) {
    return next()
  }

  const userId = ctx.user ? generateUserMetadataID(ctx.user._id!) : undefined

  return context.doInWorkspaceContext(workspaceId, async () => {
    ctx.appId = workspaceId
    if (roleId) {
      ctx.roleId = roleId
      const globalId = ctx.user ? ctx.user._id : undefined
      ctx.user = {
        ...ctx.user!,
        // override userID with metadata one
        _id: userId,
        userId,
        globalId,
        roleId,
        role: await roles.getRole(roleId, { defaultPublic: true }),
      }
    }

    return next()
  })
}) as Middleware
