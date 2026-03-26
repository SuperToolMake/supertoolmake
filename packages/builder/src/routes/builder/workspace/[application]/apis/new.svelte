<script lang="ts">
import { notifications } from "@budibase/bbui"
import { SourceName, type Datasource } from "@budibase/types"
import { goto as gotoStore } from "@roxi/routify"
import IntegrationIcon from "@/components/backend/DatasourceNavigator/IntegrationIcon.svelte"
import CreationPage from "@/components/common/CreationPage.svelte"
import { IntegrationTypes } from "@/constants/backend"
import { datasources, sortedIntegrations as integrations } from "@/stores/builder"
import { configFromIntegration } from "@/stores/selectors"
import CreateExternalDatasourceModal from "../data/_components/CreateExternalDatasourceModal/index.svelte"
import DatasourceOption from "../data/_components/DatasourceOption.svelte"

const openRestModal = () => {
  if (!restIntegration) {
    notifications.error("REST API integration is unavailable.")
    return
  }
  externalDatasourceModal.show(restIntegration)
}

const close = () => {
  if (restDatasources.length) {
    goto(`../datasource/[datasourceId]`, {
      datasourceId: restDatasources[0]._id!,
    })
  } else {
    goto("../")
  }
}

$: goto = $gotoStore

let externalDatasourceModal: CreateExternalDatasourceModal
let externalDatasourceLoading = false

$: restIntegration = ($integrations || []).find(
  integration => integration.name === IntegrationTypes.REST
)

$: restDatasources = ($datasources.list || []).filter(
  datasource => datasource.source === SourceName.REST
)

$: hasRestDatasources = restDatasources.length > 0
$: disabled = externalDatasourceLoading

const createDatasource = async (datasource: Datasource) => {
  if (!restIntegration) {
    notifications.error("REST API integration is unavailable.")
    return
  }

  try {
    const integrationConfig = configFromIntegration(restIntegration)
    datasource.config = integrationConfig
    const ds = await datasources.create({
      integration: restIntegration,
      datasource,
    })
    await datasources.fetch()
    goto(`../datasource/[datasourceId]`, {
      datasourceId: ds._id!,
    })
  } catch (error: any) {
    notifications.error(error?.message || "There was a problem creating your new api")
  }
}
</script>

<CreateExternalDatasourceModal
  bind:loading={externalDatasourceLoading}
  bind:this={externalDatasourceModal}
  on:create={event => createDatasource(event.detail)}
/>

<CreationPage
  showClose={hasRestDatasources}
  onClose={close}
  heading="Add new API"
>
  {#if restIntegration}
    <br />
    <div class="options">
      <DatasourceOption
        on:click={openRestModal}
        title="Custom REST API"
        disabled={disabled}
      >
        <IntegrationIcon
          integrationType={restIntegration.name}
          schema={restIntegration}
          size="20"
        />
      </DatasourceOption>
    </div>
  {:else}
    <p class="empty-state">REST API integration is unavailable.</p>
  {/if}
</CreationPage>

<style>
  .options {
    width: 100%;
    min-width: 100%;
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fill, 235px);
    justify-content: flex-start;
    margin-bottom: 20px;
    max-width: calc(4 * 235px + 3 * 16px);
    margin-left: auto;
    margin-right: auto;
  }
</style>
