import { cache } from "@supertoolmake/backend-core"
import type { SystemRestoreResponse, UserCtx } from "@supertoolmake/types"

export async function systemRestored(ctx: UserCtx<void, SystemRestoreResponse>) {
  await cache.bustCache(cache.CacheKey.CHECKLIST)
  ctx.body = {
    message: "System prepared after restore.",
  }
}
