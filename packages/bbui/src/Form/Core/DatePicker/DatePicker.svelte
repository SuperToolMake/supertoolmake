<script lang="ts" generics="V">
import "@spectrum-css/calendar/dist/index-vars.css"
import "@spectrum-css/inputgroup/dist/index-vars.css"
import "@spectrum-css/textfield/dist/index-vars.css"
import type dayjs from "dayjs"
import { onMount } from "svelte"
import { PopoverAlignment } from "../../../constants"
import { parseDate } from "../../../helpers"
import Popover from "../../../Popover/Popover.svelte"
import DateInput from "./DateInput.svelte"
import DatePickerPopoverContents from "./DatePickerPopoverContents.svelte"
import { getLocaleStartDayOfWeek, type Weekday } from "./utils"

export let id = null
export let disabled = false
export let readonly = false
export let error = null
export let enableTime = true
export let value: V | null = null
export let placeholder: string | null = null
export let timeOnly = false
export let ignoreTimezones = false
export let useKeyboardShortcuts = true
export let appendTo = undefined
export let api = null
export let align: PopoverAlignment = PopoverAlignment.Left
const browserStartDayOfWeek = getLocaleStartDayOfWeek()
export let startDayOfWeek: Weekday | undefined = undefined

let isOpen = false
let anchor: HTMLElement
let popover: Popover

const onOpen = () => {
  isOpen = true
}

const onClose = () => {
  isOpen = false
}

$: resolvedStartDayOfWeek = startDayOfWeek ?? browserStartDayOfWeek

$: parsedValue = parseDate(value as string | dayjs.Dayjs | null, {
  enableTime,
})

onMount(() => {
  api = {
    open: () => popover?.show(),
    close: () => popover?.hide(),
  }
})
</script>

<DateInput
  bind:anchor
  {disabled}
  {readonly}
  {error}
  {placeholder}
  {id}
  {enableTime}
  {timeOnly}
  focused={isOpen}
  value={parsedValue}
  on:click={popover?.show}
  icon={timeOnly ? "clock" : "calendar"}
/>

<Popover
  bind:this={popover}
  on:open
  on:close
  on:open={onOpen}
  on:close={onClose}
  portalTarget={appendTo}
  {anchor}
  {align}
  resizable={false}
>
  {#if isOpen}
    <DatePickerPopoverContents
      {useKeyboardShortcuts}
      {ignoreTimezones}
      {enableTime}
      {timeOnly}
      startDayOfWeek={resolvedStartDayOfWeek}
      value={parsedValue}
      on:change
    />
  {/if}
</Popover>
