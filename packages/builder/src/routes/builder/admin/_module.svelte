<script>
  import { admin } from "@/stores/portal"
  import { onMount } from "svelte"
  import { goto } from "@roxi/routify"

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
