<script lang="ts">
import { Body } from "@supertoolmake/bbui"
import { notifications } from "@supertoolmake/bbui"
import { goto as gotoStore } from "@roxi/routify"
import IntegrationIcon from "@/components/backend/DatasourceNavigator/IntegrationIcon.svelte"
import CreationPage from "@/components/common/CreationPage.svelte"
import { IntegrationTypes } from "@/constants/backend"
import { datasources, sortedIntegrations as integrations } from "@/stores/builder"
import CreateExternalDatasourceModal from "../data/_components/CreateExternalDatasourceModal/index.svelte"
import DatasourceOption from "../data/_components/DatasourceOption.svelte"
import { helpers } from "@supertoolmake/shared-core"

const openDatasourceModal = (integration: any) => {
  if (!integration) {
    notifications.error("Integration is unavailable.")
    return
  }
  externalDatasourceModal.show(integration)
}

const close = () => {
  if (nonSqlDatasources.length) {
    goto(`../datasource/[datasourceId]`, {
      datasourceId: nonSqlDatasources[0]._id!,
    })
  } else {
    goto("../")
  }
}

$: goto = $gotoStore

let externalDatasourceModal: CreateExternalDatasourceModal
let externalDatasourceLoading = false

$: nonSqlIntegrations = ($integrations || []).filter(
  (integration) => !helpers.isSQL({ source: integration.name })
)

$: restIntegration = nonSqlIntegrations.find((i) => i.name === IntegrationTypes.REST)
$: otherNonSqlIntegrations = nonSqlIntegrations.filter((i) => i.name !== IntegrationTypes.REST)

$: nonSqlDatasources = ($datasources.list || []).filter((datasource) => !helpers.isSQL(datasource))

$: hasNonSqlDatasources = nonSqlDatasources.length > 0
$: disabled = externalDatasourceLoading
</script>

<CreateExternalDatasourceModal
  bind:loading={externalDatasourceLoading}
  bind:this={externalDatasourceModal}
/>

<CreationPage
  showClose={hasNonSqlDatasources}
  onClose={close}
  heading="Add new API"
>
  {#if restIntegration}
    <div class="options">
      <DatasourceOption
        on:click={() => openDatasourceModal(restIntegration)}
        title={restIntegration.friendlyName}
        {disabled}
      >
        <IntegrationIcon
          integrationType={restIntegration.name}
          schema={restIntegration}
          size="32"
        />
      </DatasourceOption>
    </div>
  {/if}
  {#if otherNonSqlIntegrations.length > 0}
    <div class="subHeading">
      <Body>Other connectors</Body>
    </div>
    <div class="options">
      {#each otherNonSqlIntegrations as integration}
        <DatasourceOption
          on:click={() => openDatasourceModal(integration)}
          title={integration.friendlyName}
          {disabled}
        >
          <IntegrationIcon
            integrationType={integration.name}
            schema={integration}
            size="32"
          />
        </DatasourceOption>
      {/each}
    </div>
  {/if}
</CreationPage>

<style>
  .subHeading {
    display: flex;
    align-items: center;
    margin-top: 12px;
    margin-bottom: 24px;
    gap: 8px;
  }
  .subHeading :global(p) {
    color: var(--spectrum-global-color-gray-600) !important;
  }
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
