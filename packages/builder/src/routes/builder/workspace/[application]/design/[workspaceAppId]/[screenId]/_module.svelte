<script lang="ts">
  import { goto, params } from "@roxi/routify"
  import {
    builderStore,
    componentStore,
    screenStore,
    workspaceAppStore,
  } from "@/stores/builder"
  import { onMount } from "svelte"
  import AppPanel from "./_components/AppPanel.svelte"
  import LeftPanel from "./_components/LeftPanel.svelte"
  import TopBar from "@/components/common/TopBar.svelte"

  $goto
  $params

  $: navigateToComponent($componentStore.selectedComponentId)

  const navigateToComponent = (componentId: string | undefined) => {
    if (!componentId) {
      return
    }
    $goto("./[componentId]", { componentId })
  }

  const validate = (id: string) =>
    $screenStore.screens.some(screen => screen._id === id)

  onMount(() => {
    const screenId = $params.screenId
    if (validate(screenId)) {
      screenStore.select(screenId)
      const componentId = $params.componentId
      if (!componentId) {
        componentStore.select(`${screenId}-screen`)
      }
    }
  })
</script>

<div class="design" class:resizing-panel={$builderStore.isResizingPanel}>
  <TopBar
    breadcrumbs={[
      { text: "Apps", url: "../../" },
      { text: $workspaceAppStore.selectedWorkspaceApp?.name },
    ]}
    icon="browser"
  ></TopBar>
  <div class="content">
    <LeftPanel />
    <AppPanel />
    <slot />
  </div>
</div>

<style>
  .design {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
  }
  .content {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: stretch;
    flex: 1 1 auto;
    height: 0;
  }
  .design.resizing-panel {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }
</style>
