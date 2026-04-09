import type { UpdateNavigationRequest } from "@supertoolmake/types"
import type { BaseAPIClient } from "./types"

export interface NavigationEndpoints {
  updateNavigation: (appId: string, navigation: UpdateNavigationRequest) => Promise<void>
}

export const buildNavigationEndpoints = (API: BaseAPIClient): NavigationEndpoints => ({
  updateNavigation: async (appId: string, navigation: UpdateNavigationRequest) => {
    return await API.put<UpdateNavigationRequest>({
      url: `/api/navigation/${appId}`,
      body: navigation,
    })
  },
})
