<script>
import { goto, params } from "@roxi/routify"
import QueryViewer from "@/components/integration/QueryViewer.svelte"
import RestQueryViewer from "@/components/integration/RestQueryViewer.svelte"
import { IntegrationTypes } from "@/constants/backend"
import { datasources } from "@/stores/builder"
import { helpers } from "@supertoolmake/shared-core"

$: datasource = $datasources.list.find((ds) => ds._id === $params.datasourceId)
$: isSqlSource = datasource ? helpers.isSQL(datasource) : false
$: isRestSource = datasource?.source === IntegrationTypes.REST
$: {
  if (!datasource) {
    $goto("../../../")
  } else if (isSqlSource) {
    $goto(`../../../data/query/new/${$params.datasourceId}`)
  }
}

$: query = datasource
  ? {
      name: "Untitled query",
      transformer: "return data",
      schema: {},
      datasourceId: datasource._id,
      parameters: [],
      fields: {},
      queryVerb: "read",
    }
  : undefined
</script>

{#if datasource && !isSqlSource}
  {#if isRestSource}
    <RestQueryViewer />
  {:else if query}
    <QueryViewer {query} />
  {/if}
{/if}
