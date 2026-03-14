import type { PublishStatusResource } from "../api"
import type { Screen, WorkspaceApp } from "../documents"

export interface UIWorkspaceApp extends WorkspaceApp {
  screens: Screen[]
  publishStatus: PublishStatusResource
}
