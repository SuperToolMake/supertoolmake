<script>
  import { datasources } from "@/stores/builder"
  import { goto as gotoStore } from "@roxi/routify"
  import { onMount } from "svelte"
  import { IntegrationTypes } from "@/constants/backend"

  $: goto = $gotoStore

  onMount(async () => {
    const restDatasources = ($datasources.list || []).filter(
      datasource => datasource.source === IntegrationTypes.REST
    )

    if ($datasources.selected?.source === IntegrationTypes.REST) {
      goto(`../[datasourceId]`, {
        datasourceId: $datasources.selected?._id,
      })
    } else if (restDatasources.length) {
      goto(`../[datasourceId]`, {
        datasourceId: restDatasources[0]._id,
      })
    } else {
      goto("../../new")
    }
  })
</script>
