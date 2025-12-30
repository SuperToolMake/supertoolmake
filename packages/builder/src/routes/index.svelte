<script>
  import { goto } from "@roxi/routify"
  import { auth } from "@/stores/portal"
  import { onMount } from "svelte"
  import { notifications } from "@budibase/bbui"

  $goto

  onMount(async () => {
    try {
      await auth.checkQueryString()
    } catch (error) {
      notifications.error("Error setting org")
    }
    $goto(`./builder`)
  })
</script>
