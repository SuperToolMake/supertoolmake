<script lang="ts">
import { goto } from "@roxi/routify"
import { onMount } from "svelte"
import { IntegrationTypes } from "@/constants/backend"
import { datasources } from "@/stores/builder"

$goto

onMount(() => {
  const restDatasources = ($datasources.list || []).filter(
    (datasource) => datasource.source === IntegrationTypes.REST
  )

  if (restDatasources.length) {
    $goto(`../datasource/[datasourceId]`, {
      datasourceId: restDatasources[0]._id ?? "",
    })
  } else {
    $goto("../new")
  }
})
</script>
