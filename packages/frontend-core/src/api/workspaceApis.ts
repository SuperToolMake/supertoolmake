import type { UpdateWorkspaceAPIRequest, WorkspaceAPIResponse } from "@supertoolmake/types"
import type { BaseAPIClient } from "./types"

export interface WorkspaceAPIEndpoints {
  getWorkspaceAPI: () => Promise<WorkspaceAPIResponse>
  saveWorkspaceAPI: (request: UpdateWorkspaceAPIRequest) => Promise<WorkspaceAPIResponse>
}

export const buildWorkspaceAPIEndpoints = (API: BaseAPIClient): WorkspaceAPIEndpoints => ({
  getWorkspaceAPI: async () => await API.get({ url: "/api/workspace/apis" }),
  saveWorkspaceAPI: async (request) => await API.put({ url: "/api/workspace/apis", body: request }),
})
