<script>
import { goto, params } from "@roxi/routify"
import APIEndpointViewer from "@/components/integration/APIEndpointViewer.svelte"
import RestQueryViewer from "@/components/integration/RestQueryViewer.svelte"
import { IntegrationTypes } from "@/constants/backend"
import { datasources } from "@/stores/builder"

$: datasource = $datasources.list.find((ds) => ds._id === $params.datasourceId)
$: isRestSource = datasource?.source === IntegrationTypes.REST
$: {
  if (!datasource) {
    $goto("../../../")
  } else if (!isRestSource) {
    $goto(`../../../data/query/new/${$params.datasourceId}`)
  }
}
</script>

{#if isRestSource}
  {#if datasource.restTemplate}
    <APIEndpointViewer datasourceId={$params.datasourceId} />
  {:else}
    <RestQueryViewer />
  {/if}
{/if}
