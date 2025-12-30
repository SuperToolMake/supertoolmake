<script lang="ts">
  import { builderStore, datasources } from "@/stores/builder"
  import { params } from "@roxi/routify"

  $: setId($params.datasourceId)
  $: datasourceId = $datasources.selectedDatasourceId
  $: builderStore.selectResource(datasourceId!)

  const validate = (id: string) => $datasources.list?.some(ds => ds._id === id)

  const setId = (id: string) => {
    if (validate(id)) {
      datasources.select(id)
    }
  }
</script>

{#key $datasources.selected}
  <slot />
{/key}
