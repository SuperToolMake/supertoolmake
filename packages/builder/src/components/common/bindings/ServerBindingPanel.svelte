<script>
import { snippets } from "@/stores/builder"
import BindingPanel from "./BindingPanel.svelte"

export let bindings = []
export let value = ""
export let allowJS = false
export let allowHBS = true
export let context = null

// Ensure bindings have the correct properties
const enrichBindings = (bindings) => {
  return bindings?.map((binding) => ({
    ...binding,
    readableBinding: binding.readableBinding || binding.label,
    runtimeBinding: binding.runtimeBinding || binding.path,
  }))
}

$: enrichedBindings = enrichBindings(bindings)
</script>

<BindingPanel
  bindings={enrichedBindings}
  snippets={$snippets}
  allowHelpers
  {value}
  {allowJS}
  {allowHBS}
  {context}
  on:change
/>
