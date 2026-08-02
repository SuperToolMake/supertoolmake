import type { Document } from "../document"
import type { RestConfig } from "./datasource"

export const WORKSPACE_API_CONFIG_ID = "workspace_api_config"

export interface WorkspaceAPI extends Document {
  type: "workspace_api"
  config: RestConfig
}
