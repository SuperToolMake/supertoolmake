<script>
import { goto } from "@roxi/routify"
import { onMount } from "svelte"
import { appStore, screenStore } from "@/stores/builder"

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
