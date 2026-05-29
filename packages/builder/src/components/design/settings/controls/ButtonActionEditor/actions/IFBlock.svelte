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
    Configure a condition for the IF block. If the condition is met, the IF
    actions are executed. Otherwise, the ELSE actions are executed.
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
    display: flex;
    flex-direction: column;
    gap: var(--spacing-l);
    justify-content: flex-start;
    align-items: stretch;
    max-width: 500px;
    margin: 0 auto;
  }
  .condition-editor {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-l);
  }
</style>
