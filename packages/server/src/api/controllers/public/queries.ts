import type { UserCtx } from "@budibase/types"
import type { Next } from "koa"
import * as queryController from "../query"
import { search as stringSearch } from "./utils"

export async function search(ctx: UserCtx, next: Next) {
  await queryController.fetchQueries(ctx)
  const { name } = ctx.request.body
  ctx.body = stringSearch(ctx.body, name)
  await next()
}

export async function execute(ctx: UserCtx, next: Next) {
  // don't wrap this, already returns "data"
  await queryController.executeV2(ctx)
  await next()
}

export default {
  search,
  execute,
}
