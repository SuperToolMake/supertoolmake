import { constants, utils } from "@supertoolmake/backend-core"
import type { Ctx } from "@supertoolmake/types"
import type { Next } from "koa"

export function publicApiMiddleware({ requiresAppId }: { requiresAppId?: boolean } = {}) {
  return async (ctx: Ctx, next: Next) => {
    const appId = await utils.getWorkspaceIdFromCtx(ctx)
    if (requiresAppId && !appId) {
      ctx.throw(400, `Invalid app ID provided, please check the ${constants.Header.APP_ID} header.`)
    }
    if (!ctx.headers[constants.Header.API_KEY]) {
      ctx.throw(
        400,
        `Invalid API key provided, please check the ${constants.Header.API_KEY} header.`
      )
    }
    return next()
  }
}
