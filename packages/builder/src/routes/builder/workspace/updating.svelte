<script>
import { Updating } from "@supertoolmake/frontend-core"
import { goto, params } from "@roxi/routify"
import { get } from "svelte/store"

import { API } from "@/api"
import { appStore } from "@/stores/builder"
import { enrichedApps } from "@/stores/portal"

$goto
$params

$: defaultAppId = $enrichedApps.find((app) => app.editable)?.devId || $enrichedApps[0]?.devId
$: if (!get(appStore).appId && defaultAppId) {
  appStore.update((state) => ({ ...state, appId: defaultAppId }))
}

async function isMigrationDone() {
  const response = await API.getMigrationStatus()
  return response.migrated
}

async function onMigrationDone() {
  // For some reason routify params is not stripping the ? properly, so we need to check both with and without ?
  const returnUrl = $params.returnUrl || $params["?returnUrl"]
  $goto(returnUrl)
}
</script>

<Updating {isMigrationDone} {onMigrationDone} />
