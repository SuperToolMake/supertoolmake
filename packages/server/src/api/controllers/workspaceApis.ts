import type {
  RestConfig,
  UpdateWorkspaceAPIRequest,
  UserCtx,
  WorkspaceAPIResponse,
} from "@supertoolmake/types"
import sdk from "../../sdk"

export async function fetch(ctx: UserCtx<void, WorkspaceAPIResponse>) {
  const config = await sdk.workspaceApis.getResponse()
  ctx.body = { config: (config.config || {}) as RestConfig }
}

export async function update(ctx: UserCtx<UpdateWorkspaceAPIRequest, WorkspaceAPIResponse>) {
  const saved = await sdk.workspaceApis.save(ctx.request.body.config as RestConfig)
  const response = await sdk.workspaceApis.getResponse()
  ctx.body = { ...saved, config: (response.config || {}) as RestConfig }
}
