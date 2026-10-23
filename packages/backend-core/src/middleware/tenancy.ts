import type { Ctx } from "@supertoolmake/types"
import type { Middleware, Next } from "koa"
import { DEFAULT_TENANT_ID, Header } from "../constants"
import { doInTenant } from "../context"

export function tenancy() {
  return (async (ctx: Ctx, next: Next) => {
    ctx.set(Header.TENANT_ID, DEFAULT_TENANT_ID)
    return doInTenant(DEFAULT_TENANT_ID, next)
  }) as Middleware
}
