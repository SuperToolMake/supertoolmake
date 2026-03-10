<script>
  import { syncURLToState } from "@/helpers/urlStateSync"
  import { builderStore, datasources, queries } from "@/stores/builder"
  import { IntegrationTypes } from "@/constants/backend"
  import * as routify from "@roxi/routify"
  import { params } from "@roxi/routify"
  import { onDestroy } from "svelte"

  // Extract stores from namespace for Svelte 5 compatibility
  const { goto, url, isActive, page, layout } = routify

  $goto
  $params
  $url
  $isActive
  $page
  $layout

  $: datasourceId = $datasources.selectedDatasourceId
  $: builderStore.selectResource(datasourceId)
  $: {
    const ds = $datasources.selected
    if (ds?.source === IntegrationTypes.REST) {
      const firstQuery = $queries.list.find(q => q.datasourceId === ds._id)
      if (firstQuery) {
        goto(`/builder/workspace/[application]/apis/query/[queryId]`, {
          application: $params.application,
          queryId: firstQuery._id,
        })
      } else {
        goto(`/builder/workspace/[application]/apis/query/new/[datasourceId]`, {
          application: $params.application,
          datasourceId: ds._id,
        })
      }
    }
  }

  const stopSyncing = syncURLToState({
    urlParam: "datasourceId",
    stateKey: "selectedDatasourceId",
    validate: id => $datasources.list?.some(ds => ds._id === id),
    update: datasources.select,
    fallbackUrl: "../",
    store: datasources,
    routify,
  })

  onDestroy(stopSyncing)
</script>

{#key $params.datasourceId}
  {#if $datasources.selected}
    <slot />
  {/if}
{/key}
