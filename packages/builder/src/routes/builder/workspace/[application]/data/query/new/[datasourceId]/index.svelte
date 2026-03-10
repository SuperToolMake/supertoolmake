<script>
  import { params, goto as gotoStore } from "@roxi/routify"
  import QueryViewer from "@/components/integration/QueryViewer.svelte"
  import { IntegrationTypes } from "@/constants/backend"
  import { datasources } from "@/stores/builder"

  $: goto = $gotoStore

  $: datasource = $datasources.list.find(ds => ds._id === $params.datasourceId)
  $: isRestDatasource = datasource?.source === IntegrationTypes.REST
  $: {
    if (!datasource) {
      goto(`/builder/workspace/[application]/data`, {
        application: $params.application,
      })
    } else if (isRestDatasource) {
      goto(`/builder/workspace/[application]/apis/query/new/[datasourceId]`, {
        application: $params.application,
        datasourceId: $params.datasourceId,
      })
    }
  }
  $: query = datasource
    ? {
        name: "Untitled query",
        transformer: "return data",
        schema: {},
        datasourceId: $params.datasourceId,
        parameters: [],
        fields: {},
        queryVerb: "read",
      }
    : null
</script>

{#if datasource && query && !isRestDatasource}
  <QueryViewer {query} />
{/if}
