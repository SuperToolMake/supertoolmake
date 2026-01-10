import { env as coreEnv } from "@budibase/backend-core"
import { Ctx, SystemStatusResponse } from "@budibase/types"

export const fetch = async (ctx: Ctx<void, SystemStatusResponse>) => {
  let status: SystemStatusResponse | undefined

  status = {
    health: {
      passing: true,
    },
  }

  if (coreEnv.VERSION) {
    status.version = coreEnv.VERSION
  }

  ctx.body = status
}
