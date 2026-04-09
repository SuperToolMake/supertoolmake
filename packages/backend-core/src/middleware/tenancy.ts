import {
  type Ctx,
  type EndpointMatcher,
  type GetTenantIdOptions,
  TenantResolutionStrategy,
} from "@supertoolmake/types"
import type { Middleware, Next } from "koa"
import { Header } from "../constants"
import { doInTenant } from "../context"
import { getTenantIDFromCtx } from "../tenancy"
import { buildMatcherRegex, matches } from "./matchers"

export function tenancy(
  allowQueryStringPatterns: EndpointMatcher[],
  noTenancyPatterns: EndpointMatcher[],
  opts: { noTenancyRequired?: boolean } = { noTenancyRequired: false }
) {
  const allowQsOptions = buildMatcherRegex(allowQueryStringPatterns)
  const noTenancyOptions = buildMatcherRegex(noTenancyPatterns)

  return (async (ctx: Ctx, next: Next) => {
    const allowNoTenant = opts.noTenancyRequired || Boolean(matches(ctx, noTenancyOptions))
    const tenantOpts: GetTenantIdOptions = {
      allowNoTenant,
    }

    const allowQs = Boolean(matches(ctx, allowQsOptions))
    if (!allowQs) {
      tenantOpts.excludeStrategies = [TenantResolutionStrategy.QUERY]
    }

    const tenantId = getTenantIDFromCtx(ctx, tenantOpts)
    if (tenantId) {
      ctx.set(Header.TENANT_ID, tenantId)
    }
    return doInTenant(tenantId, next)
  }) as Middleware
}
