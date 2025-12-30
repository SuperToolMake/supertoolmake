<script>
  import { goto } from "@roxi/routify"
  import { auth, admin } from "@/stores/portal"
  import { onMount } from "svelte"
  import { notifications } from "@budibase/bbui"

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
