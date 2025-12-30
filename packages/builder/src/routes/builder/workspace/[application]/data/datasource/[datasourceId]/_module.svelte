<script lang="ts">
  import { builderStore, datasources } from "@/stores/builder"
  import { params } from "@roxi/routify"

  $: datasourceId = $datasources.selectedDatasourceId
  $: builderStore.selectResource(datasourceId!)
</script>

{#key $params.datasourceId}
  {#if $datasources.selected}
    <slot />
  {/if}
{/key}
