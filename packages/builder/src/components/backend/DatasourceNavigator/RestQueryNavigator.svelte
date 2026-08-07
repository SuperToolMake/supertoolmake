<script>
import { Layout } from "@supertoolmake/bbui"
import { datasources, queries } from "@/stores/builder"
import { WORKSPACE_API_CONFIG_ID } from "@supertoolmake/types"
import QueryNavItem from "./QueryNavItem.svelte"

export let searchTerm

const datasource = {
  _id: WORKSPACE_API_CONFIG_ID,
  source: "REST",
  name: "APIs",
}

$: restDatasourceIds = new Set(
  ($datasources.list || []).filter((source) => source.source === "REST").map((source) => source._id)
)
$: restQueries = $queries.list.filter(
  (query) =>
    query.datasourceId === WORKSPACE_API_CONFIG_ID || restDatasourceIds.has(query.datasourceId)
)
$: filteredQueries = restQueries.filter(
  (query) => !searchTerm || query.name?.toLowerCase().includes(searchTerm.toLowerCase())
)
</script>

<div class="queries">
  {#each filteredQueries as query}
    <QueryNavItem {datasource} {query} indentLevel={0} />
  {/each}
</div>

{#if searchTerm && filteredQueries.length === 0}
  <Layout paddingY="none" paddingX="L">
    <div class="no-results">There aren't any APIs matching that name</div>
  </Layout>
{/if}

<style>
  .queries {
    display: flex;
    flex-direction: column;
  }

  .no-results {
    color: var(--spectrum-global-color-gray-600);
  }
</style>
