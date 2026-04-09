import type { FetchIntegrationsResponse, FindIntegrationResponse, UserCtx } from "@supertoolmake/types"
import { getDefinition, getDefinitions } from "../../integrations"

export async function fetch(ctx: UserCtx<void, FetchIntegrationsResponse>) {
  const definitions = await getDefinitions()
  ctx.body = definitions
}

export async function find(ctx: UserCtx<void, FindIntegrationResponse>) {
  const integration = await getDefinition(ctx.params.type)
  if (!integration) {
    ctx.throw(404, "Integration not found")
  }
  ctx.body = integration
}
