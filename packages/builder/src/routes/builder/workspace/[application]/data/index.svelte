<script lang="ts">
import { goto } from "@roxi/routify"
import { onMount } from "svelte"
import type { Datasource, Table } from "@budibase/types"
import { IntegrationTypes } from "@/constants/backend"
import { datasources } from "@/stores/builder"

$goto

const getFirstTableId = (datasource: Datasource): string | undefined => {
  const entities = datasource.entities
  if (!entities) return undefined

  const entries = Object.entries(entities as Record<string, Table>)
  return entries.find(([_, table]) => table?._id)?.[1]?._id
}

onMount(() => {
  const nonRestDatasources = $datasources.list.filter((ds) => ds.source !== IntegrationTypes.REST)
  let tableId: string | undefined
  for (let ds of nonRestDatasources) {
    tableId = getFirstTableId(ds)
    if (tableId) break
  }
  if (nonRestDatasources.length > 0 && tableId) {
    $goto(`../table/[tableId]`, { tableId })
  } else if (nonRestDatasources.length > 0) {
    $goto(`../datasource/[datasourceId]`, {
      datasourceId: nonRestDatasources[0]._id!,
    })
  } else {
    $goto("../new")
  }
})
</script>
