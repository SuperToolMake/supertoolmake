import type { FetchAppPackageResponse } from "@supertoolmake/types"
import { appStore } from "./app"
import { selectedAppUrls } from "./appUrls"
import { builderStore } from "./builder"
import { componentStore } from "./components"
import componentTreeNodesStore from "./componentTreeNodes"
import { componentTreeSearchStore } from "./componentTreeSearch"
import { contextMenuStore } from "./contextMenu"
import { dataAPI, dataEnvironmentStore } from "./dataEnvironment"
import { datasources } from "./datasources"
import { deploymentStore } from "./deployment"
import { hoverStore } from "./hover"
import { initialiseBuilder } from "./initialise"
import { integrations } from "./integrations"
import { layoutStore } from "./layouts"
import { navigationStore } from "./navigation"
import { oauth2 } from "./oauth2"
import { permissions } from "./permissions"
import { previewStore } from "./preview"
import { queries } from "./queries"
import { roles } from "./roles"
import {
  screenComponentErrorList,
  screenComponentErrors,
  screenComponentsList,
} from "./screenComponent"
import { screenStore, selectedScreen, sortedScreens } from "./screens"
import { selectedComponent } from "./selectedComponent"
import { snippets } from "./snippets"
import { sortedIntegrations } from "./sortedIntegrations"
import { tables } from "./tables"
import { themeStore } from "./theme"
import { isOnlyUser, userSelectedResourceMap, userStore } from "./users"
import { workspaceApis } from "./workspaceApis"
import { workspaceAppStore } from "./workspaceApps"
import { workspaceDeploymentStore } from "./workspaceDeployment"
import { workspaceFavouriteStore } from "./workspaceFavourites"

export const initialise = (pkg: FetchAppPackageResponse) => initialiseBuilder(pkg, appStore)

export {
  appStore,
  builderStore,
  componentStore,
  componentTreeNodesStore,
  componentTreeSearchStore,
  contextMenuStore,
  dataAPI,
  dataEnvironmentStore,
  datasources,
  deploymentStore,
  hoverStore,
  integrations,
  isOnlyUser,
  layoutStore,
  navigationStore,
  oauth2,
  permissions,
  previewStore,
  queries,
  roles,
  screenComponentErrorList,
  screenComponentErrors,
  screenComponentsList,
  screenStore,
  selectedAppUrls,
  selectedComponent,
  selectedScreen,
  snippets,
  sortedIntegrations,
  sortedScreens,
  tables,
  themeStore,
  userSelectedResourceMap,
  userStore,
  workspaceApis,
  workspaceAppStore,
  workspaceDeploymentStore,
  workspaceFavouriteStore,
}

export const reset = () => {
  appStore.reset()
  builderStore.reset()
  screenStore.reset()
  componentStore.reset()
  layoutStore.reset()
  navigationStore.reset()
  workspaceDeploymentStore.reset()
}
