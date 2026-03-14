import type { FetchAppPackageResponse } from "@budibase/types"
import { appStore } from "./app"
import { selectedAppUrls } from "./appUrls"
import { builderStore } from "./builder"
import { componentStore, selectedComponent } from "./components"
import componentTreeNodesStore from "./componentTreeNodes"
import { contextMenuStore } from "./contextMenu"
import { dataAPI, dataEnvironmentStore } from "./dataEnvironment"
import { datasources } from "./datasources"
import { deploymentStore } from "./deployment"
import { hoverStore } from "./hover"
import { integrations } from "./integrations"
import { layoutStore } from "./layouts"
import { navigationStore } from "./navigation"
import { oauth2 } from "./oauth2"
import { permissions } from "./permissions"
import { previewStore } from "./preview"
import { queries } from "./queries"
import { restTemplates } from "./restTemplates"
import { roles } from "./roles"
import { rowActions } from "./rowActions"
import {
  screenComponentErrorList,
  screenComponentErrors,
  screenComponentsList,
} from "./screenComponent"
import { screenStore, selectedScreen, sortedScreens } from "./screens"
import { snippets } from "./snippets"
import { sortedIntegrations } from "./sortedIntegrations"
// Backend
import { tables } from "./tables"
import { themeStore } from "./theme"
import { isOnlyUser, userSelectedResourceMap, userStore } from "./users"
import { workspaceAppStore } from "./workspaceApps"
import { workspaceDeploymentStore } from "./workspaceDeployment"
import { workspaceFavouriteStore } from "./workspaceFavourites"

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
  restTemplates,
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
