<script>
import { notifications } from "@budibase/bbui"
import { goto } from "@roxi/routify"
import { onMount } from "svelte"
import { admin, auth } from "@/stores/portal"

$: tenantSet = $auth.tenantSet
$: multiTenancyEnabled = $admin.multiTenancy

let loaded = false

$: {
  if (loaded && multiTenancyEnabled && !tenantSet) {
    $goto("../org")
  } else if (loaded) {
    $goto("../login")
  }
}

onMount(async () => {
  try {
    await auth.validateTenantId()
    await admin.init()
    await auth.checkQueryString()
  } catch (error) {
    notifications.error("Error getting checklist")
  }
  loaded = true
})
</script>
