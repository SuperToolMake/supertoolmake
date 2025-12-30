<script>
  import { goto } from "@roxi/routify"
  import { screenStore, appStore } from "@/stores/builder"
  import { onMount } from "svelte"

  $goto

  onMount(() => {
    const { screens } = $screenStore
    const { appId } = $appStore
    if (!appId) return
    if (screens && screens.length > 0) {
      $goto("../design")
    } else {
      $goto("../data")
    }
  })
</script>
