<script lang="ts">
  import { ActionButton, ListItem } from "@budibase/bbui"
  import { getContext } from "svelte"
  import { tables, viewsV2 } from "@/stores/builder"
  import { goto } from "@roxi/routify"
  import DetailPopover from "@/components/common/DetailPopover.svelte"
  import MagicWand from "./magic-wand.svg"
  import { AutoScreenTypes } from "@/constants"
  import CreateScreenModal from "@/routes/builder/workspace/[application]/design/_components/NewScreen/CreateScreenModal.svelte"

  $goto

  const { datasource } = getContext("grid")

  let popover: DetailPopover
  let createScreenModal: CreateScreenModal

  $: table = $tables.list.find(table => table._id === $datasource.tableId)

  export const show = () => popover?.show()
  export const hide = () => popover?.hide()

  const startScreenWizard = (autoScreenType: AutoScreenTypes) => {
    popover.hide()
    let preSelected
    if ($datasource.type === "table") {
      preSelected = $tables.list.find(x => x._id === $datasource.tableId)
    } else {
      preSelected = $viewsV2.list.find(x => x.id === $datasource.id)
    }
    createScreenModal.show(autoScreenType, undefined, preSelected)
  }
</script>

<DetailPopover title="Generate" bind:this={popover}>
  <svelte:fragment slot="anchor" let:open>
    <ActionButton quiet selected={open}>
      <div class="center">
        <img height={16} alt="magic wand" src={MagicWand} />
        Generate
      </div>
    </ActionButton>
  </svelte:fragment>

  {#if $datasource.type === "table"}
    Generate a new app screen or automation from this data.
  {:else}
    Generate a new app screen from this data.
  {/if}

  <div class="generate-section">
    <div class="generate-section__title">App screens</div>
    <div class="generate-section__options">
      <div>
        <ListItem
          title="Table"
          icon="table"
          hoverable
          on:click={() => startScreenWizard(AutoScreenTypes.TABLE)}
          iconColor="var(--spectrum-global-color-gray-600)"
        />
      </div>
      <div>
        <ListItem
          title="Form"
          icon="list"
          hoverable
          on:click={() => startScreenWizard(AutoScreenTypes.FORM)}
          iconColor="var(--spectrum-global-color-gray-600)"
        />
      </div>
    </div>
  </div>
</DetailPopover>

<CreateScreenModal bind:this={createScreenModal} />

<style>
  .center {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .generate-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .generate-section__title {
    color: var(--spectrum-global-color-gray-600);
  }
  .generate-section__options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-column-gap: 16px;
    grid-row-gap: 8px;
  }
</style>
