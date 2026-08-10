<script lang="ts">
import { params } from "@roxi/routify"
import { onMount } from "svelte"
import { builderStore, tables } from "@/stores/builder"
import NavBar from "./_components/NavBar.svelte"

const validate = (id: string) => $tables.list?.some((table) => table._id === id)

$: tableId = $tables.selectedTableId
$: builderStore.selectResource(tableId!)

onMount(() => {
  const tableId = $params.tableId
  if (validate(tableId)) {
    tables.select(tableId)
  }
})
</script>

<div class="wrapper">
  <NavBar />
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
