<script>
  import { datasources } from "@/stores/builder"
  import { goto } from "@roxi/routify"
  import { onMount } from "svelte"
  import { IntegrationTypes } from "@/constants/backend"

  onMount(async () => {
    const restDatasources = ($datasources.list || []).filter(
      datasource => datasource.source === IntegrationTypes.REST
    )

    if ($datasources.selected?.source === IntegrationTypes.REST) {
      $goto(`./${$datasources.selected?._id}`)
    } else if (restDatasources.length) {
      $goto(`./${restDatasources[0]._id}`)
    } else {
      $goto("../new")
    }
  })
</script>
