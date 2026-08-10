<script>
import { cloneDeep } from "lodash/fp"
import { goto } from "@roxi/routify"
import QueryViewer from "@/components/integration/QueryViewer.svelte"
import RestQueryViewer from "@/components/integration/RestQueryViewer.svelte"
import { IntegrationTypes } from "@/constants/backend"
import { datasources, queries, workspaceApis } from "@/stores/builder"
import { WORKSPACE_API_CONFIG_ID } from "@supertoolmake/types"
import { helpers } from "@supertoolmake/shared-core"

$: query = $queries.selected
$: editableQuery = cloneDeep(query)
$: datasource =
  query?.datasourceId === WORKSPACE_API_CONFIG_ID
    ? $workspaceApis.datasource
    : $datasources.list.find((ds) => ds._id === query?.datasourceId)
$: isSqlSource = datasource ? helpers.isSQL(datasource) : false
$: isRestSource = datasource?.source === IntegrationTypes.REST

$: {
  if (query && isSqlSource) {
    $goto(`../../data/query/[queryId]`, { queryId: query._id })
  }
}
</script>

{#if query && !isSqlSource}
  {#if isRestSource}
    <RestQueryViewer queryId={$queries.selectedQueryId} />
  {:else}
    <QueryViewer query={editableQuery} />
  {/if}
{/if}
