<script lang="ts">
  import { Select, Label, Body, Checkbox } from "@budibase/bbui"
  import {
    selectedScreen,
    componentStore,
    tables,
    datasources,
  } from "@/stores/builder"
  import DrawerBindableInput from "@/components/common/bindings/DrawerBindableInput.svelte"
  import { getSchemaForDatasourcePlus } from "@/dataBinding"
  import SaveFields from "./SaveFields.svelte"
  import { getDatasourceLikeProviders } from "@/components/design/settings/controls/ButtonActionEditor/actions/utils"
  import type { EnrichedBinding } from "@budibase/types"

  export let parameters
  export let bindings: EnrichedBinding[] = []
  export let nested

  $: providerOptions = getDatasourceLikeProviders({
    asset: $selectedScreen,
    componentId: $componentStore.selectedComponentId,
    nested,
  })
  $: schemaFields = getSchemaFields(parameters?.tableId)
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

  const getSchemaFields = (resourceId: string) => {
    const { schema } = getSchemaForDatasourcePlus(resourceId, {})
    return Object.values(schema || {})
  }

  const onFieldsChanged = (e: CustomEvent) => {
    parameters.fields = e.detail
  }
</script>

<div class="root">
  <Body size="S">
    Choose the datasource that provides the row you would like to duplicate.
    <br />
    You can always add or override fields manually.
  </Body>

  <div class="params">
    <Label size="S">Datasource</Label>
    <Select
      bind:value={parameters.providerId}
      options={providerOptions}
      placeholder="None"
    />

    <Label size="S">Duplicate to Table</Label>
    <Select
      bind:value={parameters.tableId}
      {options}
      getOptionLabel={option => option.label}
      getOptionValue={option => option.resourceId}
    />

    <Label size="S" />
    <Checkbox
      text="Do not display default notification"
      bind:value={parameters.notificationOverride}
    />
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

  {#if parameters.tableId}
    <div class="fields">
      <SaveFields
        parameterFields={parameters.fields}
        {schemaFields}
        on:change={onFieldsChanged}
        {bindings}
      />
    </div>
  {/if}
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

  .root :global(p) {
    line-height: 1.5;
  }

  .params {
    display: grid;
    column-gap: var(--spacing-l);
    row-gap: var(--spacing-s);
    grid-template-columns: 100px 1fr;
    align-items: center;
  }

  .fields {
    display: grid;
    column-gap: var(--spacing-l);
    row-gap: var(--spacing-s);
    grid-template-columns: 100px 1fr auto 1fr auto;
    align-items: center;
  }
</style>
