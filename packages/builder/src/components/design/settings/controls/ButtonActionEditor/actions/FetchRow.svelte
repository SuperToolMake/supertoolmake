<script lang="ts">
  import { Select, Label } from "@budibase/bbui"
  import { tables, datasources } from "@/stores/builder"
  import DrawerBindableInput from "@/components/common/bindings/DrawerBindableInput.svelte"
  import type { EnrichedBinding } from "@budibase/types"

  export let parameters
  export let bindings: EnrichedBinding[] = []

  $: datasourceMap = Object.fromEntries(
    ($datasources.list || []).map(ds => [ds._id, ds.name])
  )
  $: tableOptions = $tables.list.map(table => {
    const datasourceName = datasourceMap[table.sourceId] || "Unknown"
    return {
      label: `${datasourceName} - ${table.name}`,
      resourceId: table._id,
    }
  })
  $: options = [...(tableOptions || [])]
</script>

<div class="root">
  <Label>Table</Label>
  <Select
    bind:value={parameters.tableId}
    {options}
    getOptionLabel={table => table.label}
    getOptionValue={table => table.resourceId}
  />

  <Label size="S">Row ID</Label>
  <DrawerBindableInput
    {bindings}
    title="Row ID"
    value={parameters.rowId}
    on:change={value => (parameters.rowId = value.detail)}
  />
</div>

<style>
  .root {
    display: grid;
    column-gap: var(--spacing-l);
    row-gap: var(--spacing-s);
    grid-template-columns: 60px 1fr;
    align-items: center;
    max-width: 800px;
    margin: 0 auto;
  }
</style>
