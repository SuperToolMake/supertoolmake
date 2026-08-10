<script>
import { params } from "@roxi/routify"
import { onMount } from "svelte"
import { appStore } from "@/stores/builder"

$params

onMount(() => {
  const legacyBase = `/builder/workspace/${$params.application}`
  const suffix = window.location.pathname.slice(legacyBase.length) || "/"
  appStore.update((state) => ({ ...state, appId: $params.application }))
  window.location.replace(`/builder/workspace${suffix}${window.location.search}${window.location.hash}`)
})
</script>
