<script lang="ts">
import type { LabelPosition } from "./Field.svelte"
import { createEventDispatcher } from "svelte"
import Switch from "./Core/Switch.svelte"
import Field from "./Field.svelte"

export let value: boolean | null | undefined = undefined
export let label: string | undefined = undefined
export let labelPosition: LabelPosition = "above"
export let text: string | undefined = undefined
export let disabled: boolean | undefined = false
export let error: string | undefined = undefined
export let helpText: string | undefined = undefined
export let noPadding: boolean = false
export let noMargin: boolean = false

const dispatch = createEventDispatcher()
const onChange = (e: CustomEvent<boolean>) => {
  value = e.detail
  dispatch("change", e.detail)
}
</script>

<Field {helpText} {label} {labelPosition} {error}>
  <Switch
    {disabled}
    {noMargin}
    {text}
    {noPadding}
    value={value ?? undefined}
    on:change={onChange}
    on:click
  />
</Field>
