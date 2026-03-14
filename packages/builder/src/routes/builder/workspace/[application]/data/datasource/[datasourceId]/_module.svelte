<script lang="ts">
import { params } from "@roxi/routify"
import { builderStore, datasources } from "@/stores/builder"

$: datasourceId = $datasources.selectedDatasourceId
$: builderStore.selectResource(datasourceId!)
</script>

{#key $params.datasourceId}
  {#if $datasources.selected}
    <slot />
  {/if}
{/key}
