<script lang="ts">
import { goto } from "@roxi/routify"
import { onMount } from "svelte"
import { IntegrationTypes } from "@/constants/backend"
import { datasources } from "@/stores/builder"
import { queries } from "@/stores/builder"
import { WORKSPACE_API_CONFIG_ID } from "@supertoolmake/types"

$goto

onMount(() => {
  const restDatasourceIds = new Set(
    ($datasources.list || [])
      .filter((datasource) => datasource.source === IntegrationTypes.REST)
      .map((datasource) => datasource._id)
  )
  const restQueries = ($queries.list || []).filter(
    (query) =>
      query.datasourceId === WORKSPACE_API_CONFIG_ID || restDatasourceIds.has(query.datasourceId)
  )

  if (restQueries.length) {
    $goto(`../query/[queryId]`, {
      queryId: restQueries[0]._id ?? "",
    })
  } else {
    $goto("../new")
  }
})
</script>
