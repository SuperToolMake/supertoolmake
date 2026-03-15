<script lang="ts">
import { DatasourceFieldType } from "@budibase/types"
import BooleanField from "./fields/Boolean.svelte"
import ConnectionField from "./fields/Connection.svelte"
import FieldGroupField from "./fields/FieldGroup.svelte"
import LongFormField from "./fields/LongForm.svelte"
import ObjectField from "./fields/Object.svelte"
import SelectField from "./fields/Select.svelte"
import SensitiveLongFormField from "./fields/SensitiveLongForm.svelte"
import StringField from "./fields/String.svelte"

export let type: `${DatasourceFieldType}`
export let value: any
export let error: string | null
export let name: string
export let config: any = undefined
export let placeholder: string | undefined = undefined
export let visible: boolean = true
export let defaultHideConnectionUrl: boolean | undefined = false

// don't pass "number" type as it stops those options from being configurable
// with an environment variable
const selectComponent = (type: `${DatasourceFieldType}`) => {
  if (type === "object") {
    return ObjectField
  } else if (type === "boolean") {
    return BooleanField
  } else if (type === "longForm") {
    return LongFormField
  } else if (type === "sensitiveLongForm") {
    return SensitiveLongFormField
  } else if (type === "fieldGroup") {
    return FieldGroupField
  } else if (type === "select") {
    return SelectField
  } else if (type === "connection") {
    return ConnectionField
  } else {
    return StringField
  }
}

$: filteredType = type === DatasourceFieldType.NUMBER ? DatasourceFieldType.STRING : type

$: component = selectComponent(filteredType)
</script>

<svelte:component
  this={component}
  type={filteredType}
  {value}
  {error}
  {name}
  {config}
  {placeholder}
  {visible}
  {defaultHideConnectionUrl}
  on:blur
  on:change
  on:parsed
  on:nestedFieldBlur
/>
