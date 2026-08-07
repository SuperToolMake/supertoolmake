import type { RestConfig } from "../../../documents"

export interface WorkspaceAPIResponse {
  config: RestConfig
}

export interface UpdateWorkspaceAPIRequest {
  config: RestConfig
}
