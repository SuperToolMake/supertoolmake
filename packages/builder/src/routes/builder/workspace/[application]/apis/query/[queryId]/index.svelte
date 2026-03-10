<script>
  import { queries, datasources } from "@/stores/builder"
  import { IntegrationTypes } from "@/constants/backend"
  import { params, goto as gotoStore } from "@roxi/routify"
  import APIEndpointViewer from "@/components/integration/APIEndpointViewer.svelte"

  $: goto = $gotoStore

  $: query = $queries.selected
  $: datasource = $datasources.list.find(ds => ds._id === query?.datasourceId)
  $: isRestSource = datasource?.source === IntegrationTypes.REST

  $: {
    if (query && !isRestSource) {
      goto(`/builder/workspace/[application]/data/query/[queryId]`, {
        application: $params.application,
        queryId: query._id,
      })
    }
  }
</script>

{#if query && isRestSource}
  <APIEndpointViewer queryId={$queries.selectedQueryId} />
{/if}
