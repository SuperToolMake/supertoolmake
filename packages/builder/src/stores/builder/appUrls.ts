import { derived } from "svelte/store"
import { buildLiveUrl, buildPreviewUrl } from "@/helpers/urls"
import { lazyDerived } from "../BudiStore"
import { appStore } from "./app"
import { selectedScreen } from "./screens"
import { workspaceAppStore } from "./workspaceApps"

export const selectedAppUrls = lazyDerived(() =>
  derived(
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
)
