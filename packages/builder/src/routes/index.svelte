<script>
import { notifications } from "@budibase/bbui"
import { goto as gotoStore } from "@roxi/routify"
import { onMount } from "svelte"
import { auth } from "@/stores/portal"

$: goto = $gotoStore

onMount(async () => {
  try {
    await auth.checkQueryString()
  } catch {
    notifications.error("Error setting org")
  }
  goto(`./builder`)
})
</script>
