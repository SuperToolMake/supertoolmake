<script lang="ts">
import { CoreCheckboxGroup, CoreMultiselect } from "@supertoolmake/bbui"
import { loadTranslationsByGroup } from "@supertoolmake/frontend-core"
import {
  type FieldSchema,
  FieldType,
  type UIFieldDataProviderContext,
  type UIFieldOnChange,
  type UIFieldValidationRule,
} from "@supertoolmake/types"
import type { FieldApi, FieldState } from "@/types"
import Field from "./Field.svelte"
import { getOptions } from "./optionsParser"

export let field: string
export let label: string | undefined = undefined
export let placeholder: string | undefined = undefined
export let disabled: boolean = false
export let readonly: boolean = false
export let validation: UIFieldValidationRule[] | undefined = undefined
export let defaultValue: string | undefined = undefined
export let optionsSource: string = "schema"
export let dataProvider: UIFieldDataProviderContext | undefined = undefined
export let labelColumn: string | undefined = undefined
export let valueColumn: string | undefined = undefined
export let customOptions
export let autocomplete: boolean = false
export let onChange: UIFieldOnChange | undefined = undefined
export let optionsType: "select" | "checkbox" = "select"
export let direction: "horizontal" | "vertical" = "vertical"
export let columns: number = 1
export let span: number | undefined = undefined
export let helpText: string | undefined = undefined
export let showSelectAll: boolean = false
export let selectAllText: string = "Select all"

let fieldState: FieldState | undefined
let fieldApi: FieldApi | undefined
let fieldSchema: FieldSchema | undefined

const expand = (values?: string[] | string): string[] => {
  if (!values) {
    return []
  }
  if (Array.isArray(values)) {
    return values.slice()
  }
  return values.split(",").map((value) => value.trim())
}

const getProp = (prop: "label" | "value", x: any) => {
  return x[prop]
}

const handleChange = (e: any) => {
  const changed = fieldApi?.setValue(e.detail)
  if (onChange && changed) {
    onChange({ value: e.detail })
  }
}

$: flatOptions = optionsSource == null || optionsSource === "schema"
$: expandedDefaultValue = expand(defaultValue)
$: options = getOptions(
  optionsSource,
  fieldSchema,
  dataProvider,
  labelColumn,
  valueColumn,
  customOptions
)
const pickerLabels = loadTranslationsByGroup("picker")
</script>

<Field
  {field}
  {label}
  {disabled}
  {readonly}
  {validation}
  {span}
  {helpText}
  defaultValue={expandedDefaultValue}
  type={FieldType.ARRAY}
  bind:fieldState
  bind:fieldApi
  bind:fieldSchema
>
  {#if fieldState}
    {#if !optionsType || optionsType === "select"}
      <CoreMultiselect
        value={fieldState.value || []}
        getOptionLabel={flatOptions ? x => x : x => x.label}
        getOptionValue={flatOptions ? x => x : x => x.value}
        id={fieldState.fieldId}
        disabled={fieldState.disabled}
        readonly={fieldState.readonly}
        on:change={handleChange}
        {placeholder}
        {options}
        {autocomplete}
        searchPlaceholder={pickerLabels.searchPlaceholder}
        {showSelectAll}
        {selectAllText}
      />
    {:else if optionsType === "checkbox"}
      <CoreCheckboxGroup
        value={fieldState.value || []}
        disabled={fieldState.disabled}
        readonly={fieldState.readonly}
        {options}
        {direction}
        {columns}
        on:change={handleChange}
        getOptionLabel={flatOptions ? x => x : x => getProp("label", x)}
        getOptionValue={flatOptions ? x => x : x => getProp("value", x)}
        {showSelectAll}
        {selectAllText}
      />
    {/if}
  {/if}
</Field>
