<script lang="ts">
  import { tables, builderStore } from "@/stores/builder"
  import ViewNavBar from "./_components/ViewNavBar.svelte"
  import { params } from "@roxi/routify"
  import { onMount } from "svelte"

  $: tableId = $tables.selectedTableId
  $: builderStore.selectResource(tableId!)

  const validate = (id: string) => $tables.list?.some(table => table._id === id)

  onMount(() => {
    const tableId = $params.tableId
    if (validate(tableId)) {
      tables.select(tableId)
    }
  })
</script>

<div class="wrapper">
  <ViewNavBar />
  <slot />
</div>

<style>
  .wrapper {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    background: var(--spectrum-global-color-gray-50);
  }
</style>
