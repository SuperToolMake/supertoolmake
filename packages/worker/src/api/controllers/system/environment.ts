import { env as coreEnv } from "@budibase/backend-core"
import { Ctx, GetEnvironmentResponse } from "@budibase/types"
import env from "../../../environment"

export const fetch = async (ctx: Ctx<void, GetEnvironmentResponse>) => {
  ctx.body = {
    multiTenancy: !!env.MULTI_TENANCY,
    offlineMode: !!coreEnv.OFFLINE_MODE,
    cloud: !env.SELF_HOSTED,
    accountPortalUrl: env.ACCOUNT_PORTAL_URL,
    disableAccountPortal: !!env.DISABLE_ACCOUNT_PORTAL,
    baseUrl: env.PLATFORM_URL,
    isDev: env.isDev() && !env.isTest(),
    maintenance: [],
    passwordMinLength: env.PASSWORD_MIN_LENGTH,
  }
}
