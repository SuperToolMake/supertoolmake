<script lang="ts">
import { goto } from "@roxi/routify"
import { onMount } from "svelte"
import type { Datasource, Table } from "@budibase/types"
import { datasources } from "@/stores/builder"

$goto

const getFirstTableId = (datasource: Datasource): string | undefined => {
  const entities = datasource.entities
  if (!entities) return undefined

  const entries = Object.entries(entities as Record<string, Table>)
  return entries.find(([_, table]) => table?._id)?.[1]?._id
}

onMount(() => {
  let tableId: string | undefined
  for (let ds of $datasources.list) {
    tableId = getFirstTableId(ds)
    if (tableId) break
  }
  if ($datasources.hasData && tableId) {
    $goto(`../table/[tableId]`, { tableId })
  } else if ($datasources.hasData) {
    $goto(`../datasource/[datasourceId]`, {
      datasourceId: $datasources.list[0]._id!,
    })
  } else {
    $goto("../new")
  }
})
</script>
