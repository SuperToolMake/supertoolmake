import type { Ctx } from "@budibase/types"
import send from "koa-send"
import env from "../../environment"
import { join } from "../../utilities/centralPath"
import { DEV_ASSET_PATH, TOP_LEVEL_PATH } from "../../utilities/fileSystem"

// this is a public endpoint with no middlewares
export const serveBuilderAssets = async (ctx: Ctx<undefined, void>) => {
  const topLevelPath = env.isDev() ? DEV_ASSET_PATH : TOP_LEVEL_PATH
  const builderPath = join(topLevelPath, "builder")
  await send(ctx, ctx.file, { root: builderPath })
}
