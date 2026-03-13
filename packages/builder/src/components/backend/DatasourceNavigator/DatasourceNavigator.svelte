<script>
  import { goto, isActive, params } from "@roxi/routify"
  import { Layout } from "@budibase/bbui"
  import {
    datasources,
    queries,
    tables,
    userSelectedResourceMap,
    dataEnvironmentStore,
    workspaceDeploymentStore,
  } from "@/stores/builder"
  import QueryNavItem from "./QueryNavItem.svelte"
  import NavItem from "@/components/common/NavItem.svelte"
  import TableNavigator from "@/components/backend/TableNavigator/TableNavigator.svelte"
  import DatasourceNavItem from "./DatasourceNavItem/DatasourceNavItem.svelte"
  import { enrichDatasources } from "./datasourceUtils"
  import { onMount } from "svelte"
  import { DataEnvironmentMode } from "@budibase/types"

  $goto
  $isActive
  $params

  export let searchTerm
  export let datasourceFilter = _ => true
  export let showManageRoles = true
  export let datasourceSort
  let toggledDatasources = {}

  $: enrichedDataSources = enrichDatasources(
    $datasources,
    $params,
    $isActive,
    $tables,
    $queries,
    toggledDatasources,
    searchTerm,
    datasourceFilter
  )

  $: displayedDatasources = datasourceSort
    ? enrichedDataSources.slice().sort(datasourceSort)
    : enrichedDataSources

  function selectDatasource(datasource) {
    openNode(datasource)
    $goto("./datasource/[datasourceId]", { datasourceId: datasource._id })
  }

  const selectTable = tableId => {
    // Always use DEVELOPMENT environment if table is not published
    if (!$workspaceDeploymentStore.tables[tableId]?.published) {
      dataEnvironmentStore.setMode(DataEnvironmentMode.DEVELOPMENT)
    }
    tables.select(tableId)
    $goto("./table/[tableId]", { tableId })
  }

  function openNode(datasource) {
    toggledDatasources[datasource._id] = true
  }

  function toggleNode(datasource) {
    toggledDatasources[datasource._id] = !datasource.open
  }

  onMount(() => {
    if ($tables.selected) {
      toggledDatasources[$tables.selected.sourceId] = true
    }
  })

  $: showNoResults = searchTerm && !enrichedDataSources.find(ds => ds.show)
</script>

<div class="hierarchy-items-container">
  {#if showManageRoles}
    <NavItem
      icon="user-gear"
      text="Custom roles"
      selected={$isActive("./roles")}
      on:click={() => $goto("./roles")}
      selectedBy={$userSelectedResourceMap.roles}
    />
  {/if}
  {#each displayedDatasources.filter(ds => ds.show) as datasource}
    <DatasourceNavItem
      {datasource}
      on:click={() => selectDatasource(datasource)}
      on:iconClick={() => toggleNode(datasource)}
    />
    {#if datasource.open}
      <TableNavigator tables={datasource.tables} {selectTable} />
      {#each datasource.queries as query}
        <QueryNavItem {datasource} {query} />
      {/each}
    {/if}
  {/each}
  {#if showNoResults}
    <Layout paddingY="none" paddingX="L">
      <div class="no-results">
        There aren't any datasources matching that name
      </div>
    </Layout>
  {/if}
</div>

<style>
  .hierarchy-items-container {
    margin: 0 calc(-1 * var(--spacing-l));
  }

  .no-results {
    color: var(--spectrum-global-color-gray-600);
  }
</style>
