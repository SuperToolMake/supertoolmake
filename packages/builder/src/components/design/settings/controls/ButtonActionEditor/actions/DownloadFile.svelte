<script lang="ts">
import { Label, Select } from "@supertoolmake/bbui"
import type { EnrichedBinding } from "@supertoolmake/types"
import { onMount } from "svelte"
import DrawerBindableInput from "@/components/common/bindings/DrawerBindableInput.svelte"

export let parameters
export let bindings: EnrichedBinding[] = []

const fileOptions = [
  {
    label: "URL",
    value: "url",
  },
]

onMount(() => {
  if (!parameters.type) {
    parameters.type = "url"
  }
})
</script>

<div class="root">
  <Label size="S">File</Label>
  <Select
    placeholder={undefined}
    bind:value={parameters.type}
    options={fileOptions}
  />
  <Label size="S">URL</Label>
  <DrawerBindableInput
    title="URL"
    {bindings}
    value={parameters.url}
    on:change={value => (parameters.url = value.detail)}
  />
  <Label size="S">File name</Label>
  <DrawerBindableInput
    title="File name"
    {bindings}
    value={parameters.fileName}
    on:change={value => (parameters.fileName = value.detail)}
  />
</div>

<style>
  .root {
    display: grid;
    column-gap: var(--spacing-l);
    row-gap: var(--spacing-s);
    grid-template-columns: 60px 1fr;
    align-items: center;
    max-width: 800px;
    margin: 0 auto;
  }
</style>
