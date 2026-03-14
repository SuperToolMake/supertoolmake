<script>
import { goto } from "@roxi/routify"
import { onMount } from "svelte"
import { admin } from "@/stores/portal"

let loaded = false

$goto

onMount(() => {
  if ($admin?.checklist?.adminUser?.checked) {
    $goto("../")
  } else {
    loaded = true
  }
})
</script>

{#if loaded}
  <slot />
{/if}
