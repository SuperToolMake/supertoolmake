<script>
import { Body, Select } from "@supertoolmake/bbui"
import { onMount } from "svelte"
import DrawerBindableInput from "@/components/common/bindings/DrawerBindableInput.svelte"
import ButtonActionEditor from "../ButtonActionEditor.svelte"

export let parameters
export let bindings = []
export let nested
export let componentInstance

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

function handleIFActionsChange(e) {
  parameters.actions = e.detail
}

function handleElseActionsChange(e) {
  parameters.elseActions = e.detail
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

  <div class="branch-section">
    <div class="branch-title">IF TRUE</div>
    <ButtonActionEditor
      value={parameters.actions}
      on:change={handleIFActionsChange}
      key="actions"
      bindings={bindings}
      {nested}
      {componentInstance}
      title="IF Actions"
    />
  </div>

  <div class="branch-section">
    <div class="branch-title">ELSE</div>
    <ButtonActionEditor
      value={parameters.elseActions}
      on:change={handleElseActionsChange}
      key="elseActions"
      bindings={bindings}
      {nested}
      {componentInstance}
      title="ELSE Actions"
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
  .branch-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-s);
  }
  .branch-title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--spectrum-global-color-gray-700);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding-bottom: var(--spacing-s);
    border-bottom: 1px solid var(--spectrum-global-color-gray-300);
  }
</style>
