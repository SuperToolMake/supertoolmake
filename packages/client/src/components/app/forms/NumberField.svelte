<script lang="ts">
import { CoreStepper, CoreTextField } from "@supertoolmake/bbui"
import { type UIFieldOnChange, type UIFieldValidationRule, FieldType, type FieldSchema } from "@supertoolmake/types"
import { onDestroy } from "svelte"
import type { FieldApi, FieldState } from "@/types"
import Field from "./Field.svelte"

export let field: string
export let label: string | undefined = undefined
export let placeholder: string | undefined = undefined
export let readonly: boolean = false
export let validation: UIFieldValidationRule[] | undefined = undefined
export let defaultValue: number | undefined = undefined
export let min: number | undefined = undefined
export let max: number | undefined = undefined
export let step: number = 1
export let enableStepper: boolean = false
export let onChange: UIFieldOnChange | undefined = undefined
export let runOnInput: boolean = false
export let debounceMs: number = 500
export let span: number | undefined = undefined
export let helpText: string | undefined = undefined

let fieldState: FieldState | undefined
let fieldApi: FieldApi | undefined
let fieldSchema: FieldSchema | undefined
let debounceTimeout: ReturnType<typeof setTimeout> | undefined

const parseNumber = (val: number | undefined): number | undefined => {
  if (val == null) {
    return undefined
  }
  return Number.isNaN(val) ? undefined : parseFloat(String(val))
}

const clampValue = (val: number | undefined): number | undefined => {
  if (val == null) return undefined
  if (min != null && val < min) return min
  if (max != null && val > max) return max
  return val
}

const handleChange = (e: CustomEvent<number>) => {
  if (!fieldApi) return
  const clamped = clampValue(e.detail)
  const changed = fieldApi.setValue(clamped)
  if (changed) {
    scheduleOnChange(clamped)
  }
}

const scheduleOnChange = (value: number | undefined) => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout)
  }
  debounceTimeout = setTimeout(() => {
    onChange?.({ value })
  }, Number(debounceMs) || 0)
}

const handleInput = (e: Event) => {
  if (!runOnInput) {
    return
  }
  const target = e.target as HTMLInputElement
  scheduleOnChange(parseFloat(target.value))
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
  defaultValue={defaultValue != null ? String(defaultValue) : undefined}
  {span}
  {helpText}
  type={FieldType.NUMBER}
  bind:fieldState
  bind:fieldApi
  bind:fieldSchema
>
  {#if fieldState}
    {#if enableStepper}
      <CoreStepper
        updateOnChange={false}
        value={fieldState.value}
        on:change={handleChange}
        on:input={runOnInput ? handleInput : () => {}}
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
        on:input={runOnInput ? handleInput : () => {}}
        disabled={fieldState.disabled}
        readonly={fieldState.readonly}
        id={fieldState.fieldId}
        {placeholder}
        type="number"
      />
    {/if}
  {/if}
</Field>
