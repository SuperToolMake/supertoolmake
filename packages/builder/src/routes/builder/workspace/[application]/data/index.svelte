<script lang="ts">
  import { goto } from "@roxi/routify"
  import { datasources } from "@/stores/builder"
  import { onMount } from "svelte"

  $goto

  onMount(() => {
    // Get first valid table ID of first datasource
    let tableId: string | undefined = undefined
    for (let ds of $datasources.list) {
      if (Array.isArray(ds.entities) && ds.entities.length > 0) {
        if (ds.entities[0]?._id) {
          tableId = ds.entities[0]._id
          break
        }
      } else {
        const keys = Object.keys(ds.entities || {})
        if (keys.length > 0 && keys[0]) {
          tableId = keys[0]
          break
        }
      }
    }
    if ($datasources.hasData && tableId) {
      $goto(`../table/[tableId]`, { tableId })
    } else {
      $goto("../new")
    }
  })
</script>
