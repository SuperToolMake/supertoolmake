<script>
  import { CoreStepper, CoreTextField } from "@budibase/bbui"
  import { onDestroy } from "svelte"
  import Field from "./Field.svelte"

  export let field
  export let label
  export let placeholder
  export let disabled = false
  export let readonly = false
  export let validation
  export let defaultValue
  export let min
  export let max
  export let step = 1
  export let enableStepper = false
  export let onChange
  export let runOnInput = false
  export let debounceMs = 500
  export let span
  export let helpText = null

  let fieldState
  let fieldApi
  let debounceTimeout

const parseNumber = (val) => {
  if (val == null) {
    return null
  }

  const clampValue = val => {
  }

  const handleChange = e => {
    const clamped = clampValue(e.detail)
    const changed = fieldApi.setValue(clamped)
    if (changed) {
      scheduleOnChange(clamped)
    }
  }

  const scheduleOnChange = value => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }
    debounceTimeout = setTimeout(
      () => {
        onChange?.({ value })
      },
      Number(debounceMs) || 0
    )
  }

  const handleInput = e => {
    if (!runOnInput) {
      return
    }
    scheduleOnChange(e.target.value)
  }

  onDestroy(() => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }
  })
</script>

<Field
  {label}
  {field}
  {readonly}
  {validation}
  defaultValue={parseNumber(defaultValue)}
  {span}
  {helpText}
  type="number"
  bind:fieldState
  bind:fieldApi
>
  {#if fieldState}
    {#if enableStepper}
      <CoreStepper
        updateOnChange={false}
        value={fieldState.value}
        on:change={handleChange}
        on:input={runOnInput ? handleInput : undefined}
        disabled={fieldState.disabled}
        readonly={fieldState.readonly}
        id={fieldState.fieldId}
        {placeholder}
        {min}
        {max}
        {step}
      />
    {:else}
      <CoreTextField
        updateOnChange={false}
        value={fieldState.value}
        on:change={handleChange}
        on:input={runOnInput ? handleInput : undefined}
        disabled={fieldState.disabled}
        readonly={fieldState.readonly}
        id={fieldState.fieldId}
        {placeholder}
        type="number"
      />
    {/if}
  {/if}
</Field>
