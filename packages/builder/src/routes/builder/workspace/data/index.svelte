<script lang="ts">
import { goto } from "@roxi/routify"
import { onMount } from "svelte"
import type { Datasource, Table } from "@supertoolmake/types"
import { datasources } from "@/stores/builder"
import { helpers } from "@supertoolmake/shared-core"

$goto

const getFirstTableId = (datasource: Datasource): string | undefined => {
  const entities = datasource.entities
  if (!entities) return undefined

  const entries = Object.entries(entities as Record<string, Table>)
  return entries.find(([_, table]) => table?._id)?.[1]?._id
}

onMount(() => {
  const sqlDatasources = $datasources.list.filter((ds) => helpers.isSQL(ds))
  let tableId: string | undefined
  for (let ds of sqlDatasources) {
    tableId = getFirstTableId(ds)
    if (tableId) break
  }
  if (sqlDatasources.length > 0 && tableId) {
    $goto(`../table/[tableId]`, { tableId })
  } else if (sqlDatasources.length > 0) {
    $goto(`../datasource/[datasourceId]`, {
      datasourceId: sqlDatasources[0]._id!,
    })
  } else {
    $goto("../new")
  }
})
</script>
