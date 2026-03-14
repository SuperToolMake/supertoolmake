<script lang="ts">
import { params } from "@roxi/routify"
import { builderStore, datasources } from "@/stores/builder"

$: setId($params.datasourceId)
$: datasourceId = $datasources.selectedDatasourceId
$: builderStore.selectResource(datasourceId!)

const validate = (id: string) => $datasources.list?.some((ds) => ds._id === id)

const setId = (id: string) => {
  if (validate(id)) {
    datasources.select(id)
  }
}
</script>

{#key $datasources.selected}
  <slot />
{/key}
