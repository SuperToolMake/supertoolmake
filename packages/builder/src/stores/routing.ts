import { derived } from "svelte/store"
import { appRoutes, filterRoutes, globalRoutes, orgRoutes } from "@/settings/routes"
import { appStore } from "@/stores/builder/app"
import { admin } from "@/stores/portal/admin"
import { appsStore } from "@/stores/portal/apps"
// Use direct imports to avoid circular dependency in licensing
import { auth } from "@/stores/portal/auth"
import { flatten } from "@/types/routing"

export const permittedRoutes = derived(
  [admin, auth, appStore, appsStore],
  ([$admin, $auth, $appStore, $appsStore]) => {
    const user = $auth?.user

    if (!user) {
      return []
    }
    const routes = [
      ...globalRoutes(user),
      ...appRoutes($appStore, $appsStore),
      ...orgRoutes(user, $admin),
    ]
    return filterRoutes(routes)
  }
)

export const flattenedRoutes = derived([permittedRoutes], ([$permitted]) => {
  return flatten($permitted)
})
