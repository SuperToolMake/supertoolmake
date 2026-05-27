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
  if (!parameters.operator) parameters.operator = "equal"
  if (!parameters.value) parameters.value = ""
  if (!parameters.referenceValue) parameters.referenceValue = ""
  if (!parameters.actions) parameters.actions = []
  if (!parameters.elseActions) parameters.elseActions = []
})

function handleValueChange(e) {
  parameters.value = e.detail
}

function handleOperatorChange(e) {
  parameters.operator = e.detail
}

function handleReferenceValueChange(e) {
  parameters.referenceValue = e.detail
}
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
      on:change={handleValueChange}
      {bindings}
    />
    <Select
      value={parameters.operator}
      on:change={handleOperatorChange}
      options={operatorOptions}
      placeholder={null}
    />
    <DrawerBindableInput
      placeholder="Reference value"
      value={parameters.referenceValue}
      on:change={handleReferenceValueChange}
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
