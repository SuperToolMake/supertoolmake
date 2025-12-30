<script lang="ts">
  import {
    builderStore,
    screenStore,
    selectedScreen,
    componentStore,
  } from "@/stores/builder"
  import { findComponent } from "@/helpers/components"
  import ComponentSettingsPanel from "./_components/Component/ComponentSettingsPanel.svelte"
  import NavigationPanel from "./_components/Navigation/index.svelte"
  import ScreenSettingsPanel from "./_components/Screen/index.svelte"
  import { goto, params } from "@roxi/routify"
  import { onMount } from "svelte"
  import NewComponentPanel from "./new/_components/NewComponentPanel.svelte"

  $goto
  $params

  $: componentId = $componentStore.selectedComponentId
  $: routeComponentId = $params.componentId

  $: if (componentId) {
    builderStore.selectResource(componentId)
  }

  const validate = (id: string) => {
    if (id === `${$screenStore.selectedScreenId}-screen`) return true
    if (id === `${$screenStore.selectedScreenId}-navigation`) return true

    return !!findComponent($selectedScreen?.props, id)
  }

  onMount(() => {
    if (routeComponentId === "new") {
      return
    } else if (validate(routeComponentId)) {
      componentStore.select(routeComponentId)
    } else {
      $goto("../")
    }
  })
</script>

{#if routeComponentId === "new"}
  <NewComponentPanel />
{:else if routeComponentId === `${$screenStore.selectedScreenId}-screen`}
  <ScreenSettingsPanel />
{:else if routeComponentId === `${$screenStore.selectedScreenId}-navigation`}
  <NavigationPanel />
{:else}
  <ComponentSettingsPanel />
{/if}
<slot />
