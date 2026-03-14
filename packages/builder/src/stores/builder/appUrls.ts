import { derived } from "svelte/store"
import { buildLiveUrl, buildPreviewUrl } from "@/helpers/urls"
import { appStore, selectedScreen, workspaceAppStore } from "."

export const selectedAppUrls = derived(
  [workspaceAppStore, selectedScreen, appStore],
  ([$workspaceAppStore, $selectedScreen, $appStore]) => {
    const selectedWorkspaceApp = $workspaceAppStore.selectedWorkspaceApp

    const route = $selectedScreen?.routing.route || ""
    const workspacePrefix = selectedWorkspaceApp ? selectedWorkspaceApp.url : ""

    const previewUrl = buildPreviewUrl($appStore, workspacePrefix, route, true)

    const liveUrl = buildLiveUrl(workspacePrefix, true)
    return { previewUrl, liveUrl }
  }
)
