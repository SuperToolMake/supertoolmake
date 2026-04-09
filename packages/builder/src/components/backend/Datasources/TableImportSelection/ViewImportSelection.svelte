<script lang="ts">
import { Body, FancyCheckboxGroup, InlineAlert, Layout, ModalContent } from "@supertoolmake/bbui"
import type { Datasource } from "@supertoolmake/types"
import Spinner from "@/components/common/Spinner.svelte"
import { createViewSelectionStore } from "./viewSelectionStore"

export let datasource: Datasource
export let onComplete: () => void = () => {}

$: store = createViewSelectionStore(datasource)

$: title = "Choose your views"
$: confirmText = $store.loading || $store.hasSelected ? "Fetch views" : "Continue without fetching"
$: description = "Choose what views you want to sync with SuperToolMake"
$: selectAllText = "Select all"
</script>

<ModalContent
  {title}
  cancelText="Cancel"
  size="L"
  {confirmText}
  onConfirm={() => store.importSelectedViews(onComplete)}
  disabled={$store.loading}
>
  {#if $store.loading}
    <div class="loading">
      <Spinner size="20" />
    </div>
  {:else}
    <Layout noPadding>
      <Body size="S">{description}</Body>

      <FancyCheckboxGroup
        options={$store.viewNames}
        selected={$store.selectedViewNames}
        on:change={e => store.setSelectedViewNames(e.detail)}
        {selectAllText}
      />
      {#if $store.error}
        <InlineAlert
          type="error"
          header="Error fetching views"
          message={$store.error.message}
        />
      {/if}
    </Layout>
  {/if}
</ModalContent>

<style>
  .loading {
    display: flex;
    justify-content: center;
  }
</style>
