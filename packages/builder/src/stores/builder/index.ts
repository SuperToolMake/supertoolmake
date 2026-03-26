// biome-ignore-all format: The order of imports matters for derived stores
import { layoutStore } from "./layouts"
import { workspaceAppStore } from "./workspaceApps"
import { workspaceFavouriteStore } from "./workspaceFavourites"
import { appStore } from "./app"
import { componentStore, selectedComponent } from "./components"
import { navigationStore } from "./navigation"
import { themeStore } from "./theme"
import { screenStore, selectedScreen, sortedScreens } from "./screens"
import { builderStore } from "./builder"
import { hoverStore } from "./hover"
import { previewStore } from "./preview"
import { workspaceDeploymentStore } from "./workspaceDeployment"
import { userStore, userSelectedResourceMap, isOnlyUser } from "./users"
import { deploymentStore } from "./deployment"
import { contextMenuStore } from "./contextMenu"
import { snippets } from "./snippets"
import {
  screenComponentsList,
  screenComponentErrors,
  screenComponentErrorList,
} from "./screenComponent"

// Backend
import { tables } from "./tables"
import { permissions } from "./permissions"
import { roles } from "./roles"
import { datasources } from "./datasources"
import { integrations } from "./integrations"
import { sortedIntegrations } from "./sortedIntegrations"
import { queries } from "./queries"
import { rowActions } from "./rowActions"
import componentTreeNodesStore from "./componentTreeNodes"
import { oauth2 } from "./oauth2"
import { dataEnvironmentStore, dataAPI } from "./dataEnvironment"

import type { FetchAppPackageResponse } from "@budibase/types"
import { selectedAppUrls } from "./appUrls"

export {
  appStore,
  builderStore,
  componentStore,
  componentTreeNodesStore,
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
  rowActions,
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
  rowActions.reset()
  workspaceDeploymentStore.reset()
}

const refreshBuilderData = async () => {
  await Promise.all([
    datasources.init(),
    integrations.init(),
    queries.init(),
    tables.init(),
    roles.fetch(),
    workspaceAppStore.fetch(),
    workspaceDeploymentStore.fetch(),
  ])
}

const resetBuilderHistory = () => {
  screenStore.history.reset()
}

export const initialise = async (pkg: FetchAppPackageResponse) => {
  const { application } = pkg
  // must be first operation to make sure subsequent requests have correct app ID
  appStore.syncAppPackage(pkg)
  await Promise.all([
    appStore.syncAppRoutes(),
    componentStore.refreshDefinitions(application?.appId),
  ])
  builderStore.init(application)
  navigationStore.syncAppNavigation(application?.navigation)
  themeStore.syncAppTheme(application)
  snippets.syncMetadata(application)
  screenStore.syncAppScreens(pkg)
  layoutStore.syncAppLayouts(pkg)
  await workspaceFavouriteStore.sync()
  resetBuilderHistory()
  await refreshBuilderData()
}