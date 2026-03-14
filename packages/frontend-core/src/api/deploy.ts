import type { PublishStatusResponse } from "@budibase/types"
import type { BaseAPIClient } from "./types"

export interface DeploymentEndpoints {
  getPublishStatus: () => Promise<PublishStatusResponse>
}

export const buildDeploymentEndpoints = (API: BaseAPIClient): DeploymentEndpoints => ({
  getPublishStatus: async () => {
    return await API.get({
      url: "/api/deploy/status",
    })
  },
})
