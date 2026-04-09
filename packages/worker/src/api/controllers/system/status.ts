import { env as coreEnv } from "@supertoolmake/backend-core"
import type { Ctx, SystemStatusResponse } from "@supertoolmake/types"

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
