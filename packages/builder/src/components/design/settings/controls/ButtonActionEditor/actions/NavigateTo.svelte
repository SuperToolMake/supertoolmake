<script>
import { Label, Select } from "@supertoolmake/bbui"
import { onMount } from "svelte"
import DrawerBindableCombobox from "@/components/common/bindings/DrawerBindableCombobox.svelte"
import DrawerBindableInput from "@/components/common/bindings/DrawerBindableInput.svelte"
import DrawerBindableSlot from "@/components/common/bindings/DrawerBindableSlot.svelte"
import { screenStore } from "@/stores/builder"

export let parameters
export let bindings = []

$: urlOptions = screenStore.routes

const typeOptions = [
  {
    label: "Screen",
    value: "screen",
  },
  {
    label: "URL",
    value: "url",
  },
]

const booleanOptions = [
  { label: "True", value: "true" },
  { label: "False", value: "false" },
]

onMount(() => {
  if (!parameters.type) {
    parameters.type = "screen"
  }
  if (parameters.peek == null) {
    parameters.peek = "false"
  }
})
</script>

<div class="root">
  <Label small>Destination</Label>
  <Select
    placeholder={null}
    bind:value={parameters.type}
    options={typeOptions}
    on:change={() => (parameters.url = "")}
  />
  {#if parameters.type === "screen"}
    <DrawerBindableCombobox
      title="Destination"
      placeholder="/screen"
      value={parameters.url}
      on:change={value => {
        parameters.url = value.detail ? value.detail.trim() : value.detail
      }}
      {bindings}
      options={$urlOptions}
      appendBindingsAsOptions={false}
    />
    <div></div>
    <Label small>Open screen in modal</Label>
    <DrawerBindableSlot
      title="Open in modal"
      type="boolean"
      value={parameters.peek}
      on:change={e => (parameters.peek = e.detail)}
      {bindings}
    >
      <Select
        placeholder={false}
        options={booleanOptions}
        bind:value={parameters.peek}
        popoverAutoWidth
      />
    </DrawerBindableSlot>
  {:else}
    <DrawerBindableInput
      title="Destination"
      placeholder="/url"
      value={parameters.url}
      on:change={value => {
        parameters.url = value.detail ? value.detail.trim() : value.detail
      }}
      {bindings}
    />
    <div></div>
    <Checkbox text="New Tab" bind:value={parameters.externalNewTab} />
  {/if}
</div>

<style>
  .root {
    display: grid;
    align-items: center;
    gap: var(--spacing-m);
    grid-template-columns: auto;
    max-width: 400px;
    margin: 0 auto;
  }
</style>
