<script>
import { Body, Select } from "@supertoolmake/bbui"
import { onMount } from "svelte"
import DrawerBindableInput from "@/components/common/bindings/DrawerBindableInput.svelte"

export let parameters
export let bindings = []

const operatorOptions = [
  { label: "Equals", value: "equal" },
  { label: "Not equals", value: "notEqual" },
]

onMount(() => {
  parameters.operator ??= "equal"
  parameters.value ??= ""
  parameters.referenceValue ??= ""
  parameters.actions ??= []
  parameters.elseActions ??= []
})
</script>

<div class="root">
  <Body size="S">
    IF
  </Body>

  <div class="condition-editor">
    <DrawerBindableInput
      placeholder="Value"
      value={parameters.value}
      on:change={e => (parameters.value = e.detail)}
      {bindings}
    />
    <Select
      bind:value={parameters.operator}
      options={operatorOptions}
      placeholder={null}
    />
    <DrawerBindableInput
      placeholder="Reference value"
      value={parameters.referenceValue}
      on:change={e => (parameters.referenceValue = e.detail)}
      {bindings}
    />
  </div>
</div>

<style>
  .root {
    padding-left: var(--spacing-l);
    padding-right: var(--spacing-l);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-l);
    justify-content: flex-start;
    align-items: stretch;
    margin: 0 auto;
  }
  .condition-editor {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-l);
    max-width: 320px;
  }
</style>
