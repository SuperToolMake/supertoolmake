<script>
import FlexContainer from "./FlexContainer.svelte"
import GridContainer from "./GridContainer.svelte"

export let layout = "flex"

$: component = layout === "grid" ? GridContainer : FlexContainer
</script>

<svelte:component this={component} {...$$props}>
  <slot />
</svelte:component>
