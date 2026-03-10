<script>
  import { params, goto as gotoStore } from "@roxi/routify"
  import { datasources } from "@/stores/builder"
  import { IntegrationTypes } from "@/constants/backend"
  import APIEndpointViewer from "@/components/integration/APIEndpointViewer.svelte"

  $: goto = $gotoStore

  $: datasource = $datasources.list.find(ds => ds._id === $params.datasourceId)
  $: isRestDatasource = datasource?.source === IntegrationTypes.REST
  $: {
    if ($datasources.list.length && !datasource) {
      goto(`/builder/workspace/[application]/apis`, {
        application: $params.application,
      })
    } else if (datasource && !isRestDatasource) {
      goto(`/builder/workspace/[application]/data/query/new/[datasourceId]`, {
        application: $params.application,
        datasourceId: $params.datasourceId,
      })
    }
  }
</script>

{#if datasource}
  <APIEndpointViewer datasourceId={$params.datasourceId} />
{/if}
