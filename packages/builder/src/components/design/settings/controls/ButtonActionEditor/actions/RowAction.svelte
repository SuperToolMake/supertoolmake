<script lang="ts">
  import { Select, Label, Checkbox } from "@budibase/bbui"
  import { tables, datasources, rowActions } from "@/stores/builder"
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
  $: datasourceOptions = [...(tableOptions || [])]
  $: resourceId = parameters.resourceId
  $: rowActions.refreshRowActions(resourceId)
  $: enabledRowActions = $rowActions[resourceId] || []
  $: rowActionOptions = enabledRowActions.map(action => ({
    label: action.name,
    value: action.id,
  }))
</script>

<div class="root">
  <div class="params">
    <Label>Table or view</Label>
    <Select
      bind:value={parameters.resourceId}
      options={datasourceOptions}
      getOptionLabel={x => x.label}
      getOptionValue={x => x.resourceId}
    />

    <Label size="S">Row ID</Label>
    <DrawerBindableInput
      {bindings}
      title="Row ID"
      value={parameters.rowId}
      on:change={value => (parameters.rowId = value.detail)}
    />

    <Label size="S">Row action</Label>
    <Select bind:value={parameters.rowActionId} options={rowActionOptions} />

    <br />
    <Checkbox text="Require confirmation" bind:value={parameters.confirm} />

    {#if parameters.confirm}
      <Label size="S">Title</Label>
      <DrawerBindableInput
        placeholder="Prompt User"
        value={parameters.customTitleText}
        on:change={e => (parameters.customTitleText = e.detail)}
        {bindings}
      />
      <Label size="S">Text</Label>
      <DrawerBindableInput
        placeholder="Are you sure you want to continue?"
        value={parameters.confirmText}
        on:change={e => (parameters.confirmText = e.detail)}
        {bindings}
      />
      <Label size="S">Confirm Text</Label>
      <DrawerBindableInput
        placeholder="Confirm"
        value={parameters.confirmButtonText}
        on:change={e => (parameters.confirmButtonText = e.detail)}
        {bindings}
      />
      <Label size="S">Cancel Text</Label>
      <DrawerBindableInput
        placeholder="Cancel"
        value={parameters.cancelButtonText}
        on:change={e => (parameters.cancelButtonText = e.detail)}
        {bindings}
      />
    {/if}
  </div>
</div>

<style>
  .root {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    gap: var(--spacing-xl);
  }

  .params {
    display: grid;
    column-gap: var(--spacing-l);
    row-gap: var(--spacing-s);
    grid-template-columns: 60px 1fr;
    align-items: center;
  }
</style>
