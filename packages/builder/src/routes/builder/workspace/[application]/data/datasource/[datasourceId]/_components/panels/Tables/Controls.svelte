<script>
  import { Button, Modal } from "@budibase/bbui"
  import { integrations, tables } from "@/stores/builder"
  import CreateExternalTableModal from "./CreateExternalTableModal.svelte"
  import TableImportSelection from "@/components/backend/Datasources/TableImportSelection/index.svelte"
  import { integrationForDatasource } from "@/stores/selectors"

  export let datasource

  $: integration = datasource
    ? integrationForDatasource($integrations, datasource)
    : null

  let createExternalTableModal
  let tableSelectionModal
</script>

{#if datasource}
  <Modal bind:this={createExternalTableModal}>
    <CreateExternalTableModal {datasource} />
  </Modal>

  <Modal bind:this={tableSelectionModal}>
    <TableImportSelection
      {datasource}
      {integration}
      onComplete={() => {
        tableSelectionModal.hide()
        tables.fetch()
      }}
    />
  </Modal>

  <div class="buttons">
    <Button cta on:click={createExternalTableModal.show}
      >Create new table</Button
    >
    <Button secondary on:click={tableSelectionModal.show}>Fetch tables</Button>
  </div>
{/if}

<style>
  .buttons {
    display: flex;
    gap: var(--spacing-m);
  }
</style>
