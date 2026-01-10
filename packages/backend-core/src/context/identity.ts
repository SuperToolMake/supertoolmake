import {
  IdentityContext,
  IdentityType,
  User,
  UserContext,
  Ctx,
} from "@budibase/types"
import * as context from "."

export function getIdentity(): IdentityContext | undefined {
  return context.getIdentity()
}

export function doInIdentityContext(identity: IdentityContext, task: any) {
  return context.doInIdentityContext(identity, task)
}

// used in server/worker
export function doInUserContext(user: User, ctx: Ctx, task: any) {
  const userContext: UserContext = {
    ...user,
    _id: user._id as string,
    type: IdentityType.USER,
    hostInfo: {
      ipAddress: ctx.request.ip,
      // filled in by koa-useragent package
      userAgent: ctx.userAgent.source,
    },
  }
  return doInIdentityContext(userContext, task)
}
