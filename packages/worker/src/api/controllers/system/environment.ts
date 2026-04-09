import { env as coreEnv } from "@supertoolmake/backend-core"
import type { Ctx, GetEnvironmentResponse } from "@supertoolmake/types"
import env from "../../../environment"

export const fetch = async (ctx: Ctx<void, GetEnvironmentResponse>) => {
  ctx.body = {
    multiTenancy: Boolean(env.MULTI_TENANCY),
    offlineMode: Boolean(coreEnv.OFFLINE_MODE),
    cloud: !env.SELF_HOSTED,
    baseUrl: env.PLATFORM_URL,
    isDev: env.isDev() && !env.isTest(),
    maintenance: [],
    passwordMinLength: env.PASSWORD_MIN_LENGTH,
  }
}
