import { cache } from "@supertoolmake/backend-core"
import type { SystemRestoreResponse, UserCtx } from "@supertoolmake/types"
import env from "../../../environment"

export async function systemRestored(ctx: UserCtx<void, SystemRestoreResponse>) {
  if (!env.SELF_HOSTED) {
    ctx.throw(405, "This operation is not allowed in cloud.")
  }
  await cache.bustCache(cache.CacheKey.CHECKLIST)
  ctx.body = {
    message: "System prepared after restore.",
  }
}
