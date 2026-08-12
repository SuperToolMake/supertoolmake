import type { FetchAppPackageResponse } from "@supertoolmake/types"
import type { AppMetaStore } from "./app"
import { builderStore } from "./builder"
import { componentStore } from "./components"
import { datasources } from "./datasources"
import { integrations } from "./integrations"
import { layoutStore } from "./layouts"
import { navigationStore } from "./navigation"
import { queries } from "./queries"
import { roles } from "./roles"
import { screenStore } from "./screens"
import { snippets } from "./snippets"
import { tables } from "./tables"
import { themeStore } from "./theme"
import { workspaceAppStore } from "./workspaceApps"
import { workspaceDeploymentStore } from "./workspaceDeployment"
import { workspaceFavouriteStore } from "./workspaceFavourites"

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

export const initialiseBuilder = async (pkg: FetchAppPackageResponse, appStore: AppMetaStore) => {
  const { application } = pkg
  // Must be first so subsequent requests use the correct app ID.
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
