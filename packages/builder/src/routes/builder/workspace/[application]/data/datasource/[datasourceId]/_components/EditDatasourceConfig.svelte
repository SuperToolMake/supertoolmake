<script>
import { keepOpen, Modal, notifications } from "@supertoolmake/bbui"
import DatasourceConfigEditor from "@/components/backend/Datasources/ConfigEditor/index.svelte"
import { datasources, integrations } from "@/stores/builder"
import { integrationForDatasource } from "@/stores/selectors"
import EditDatasourceConfigButton from "./EditDatasourceConfigButton.svelte"

export let datasource

async function saveDatasource({ config, name }) {
  try {
    await datasources.save({
      integration,
      datasource: { ...datasource, config, name },
    })

    notifications.success(`Datasource ${datasource.name} updated successfully`)
  } catch (err) {
    notifications.error(err?.message ?? "Error saving datasource")

    return keepOpen
  }
}

$: integration = datasource ? integrationForDatasource($integrations, datasource) : null

let modal
</script>

{#if datasource}
  <EditDatasourceConfigButton on:click={modal.show} {datasource} />
  <Modal bind:this={modal}>
    <DatasourceConfigEditor
      defaultHideConnectionUrl={true}
      {integration}
      config={datasource.config}
      showNameField
      nameFieldValue={datasource.name}
      onSubmit={saveDatasource}
    />
  </Modal>
{/if}
