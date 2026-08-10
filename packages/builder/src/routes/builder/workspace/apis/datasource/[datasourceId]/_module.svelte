<script lang="ts">
import { params } from "@roxi/routify"
import { builderStore, datasources } from "@/stores/builder"

const validate = (id: string) => $datasources.list?.some((ds) => ds._id === id)

const setId = (id: string) => {
  if (validate(id)) {
    datasources.select(id)
  }
}

$: setId($params.datasourceId)
$: datasourceId = $datasources.selectedDatasourceId
$: builderStore.selectResource(datasourceId!)
</script>

{#key $datasources.selected}
  <slot />
{/key}
