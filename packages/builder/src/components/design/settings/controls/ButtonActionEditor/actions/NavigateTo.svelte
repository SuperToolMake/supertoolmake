<script lang="ts">
import { Checkbox, Label, RadioGroup, Select } from "@supertoolmake/bbui"
import { onMount } from "svelte"
import DrawerBindableCombobox from "@/components/common/bindings/DrawerBindableCombobox.svelte"
import DrawerBindableInput from "@/components/common/bindings/DrawerBindableInput.svelte"
import { screenStore } from "@/stores/builder"
import type {
  EnrichedBinding,
} from "@supertoolmake/types"

export let parameters
export let bindings: EnrichedBinding[] = []

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

  const screenOpenInOptions = [
    {
      label: "Same tab",
      value: "same",
    },
    {
      label: "Open in modal",
      value: "modal",
    },
    {
      label: "Open in new tab",
      value: "newTab",
    },
  ]

  const getScreenOpenIn = (p: any) => {
    if (p.screenNewTab) {
      return "newTab"
    }
    if (p.peek) {
      return "modal"
    }
    return "same"
  }

  const setScreenOpenIn = (value: "modal" | "newTab") => {
    parameters.peek = value === "modal"
    parameters.screenNewTab = value === "newTab"
  }

  $: screenOpenIn = getScreenOpenIn(parameters)

  onMount(() => {
    if (!parameters.type) {
      parameters.type = "screen"
    }
  })
</script>

<div class="root">
  <Label size="S">Destination</Label>
  <Select
    placeholder={undefined}
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
      label=""
      error={undefined}
    />
    <Label size="S">Open in</Label>
    <RadioGroup
      value={screenOpenIn}
      options={screenOpenInOptions}
      on:change={e => setScreenOpenIn(e.detail)}
    />
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
    <Checkbox text="Open in new tab" bind:value={parameters.externalNewTab} />
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
