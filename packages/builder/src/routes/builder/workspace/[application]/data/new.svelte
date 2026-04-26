<script lang="ts">
import { goto as gotoStore, params } from "@roxi/routify"
import IntegrationIcon from "@/components/backend/DatasourceNavigator/IntegrationIcon.svelte"
import CreationPage from "@/components/common/CreationPage.svelte"
import { datasources, sortedIntegrations as integrations, tables } from "@/stores/builder"
import { hasData } from "@/stores/selectors"
import CreateExternalDatasourceModal from "./_components/CreateExternalDatasourceModal/index.svelte"
import DatasourceOption from "./_components/DatasourceOption.svelte"
import { helpers } from "@supertoolmake/shared-core"

$: goto = $gotoStore
$params

let externalDatasourceModal: CreateExternalDatasourceModal

let externalDatasourceLoading = false

$: disabled = externalDatasourceLoading
</script>

<CreateExternalDatasourceModal
  bind:loading={externalDatasourceLoading}
  bind:this={externalDatasourceModal}
/>

<CreationPage
  showClose={hasData($datasources.list.filter(ds => helpers.isSQL(ds)), $tables)}
  onClose={() => goto("../")}
  heading="Connect to your SQL database"
>
  <div class="options">
    {#each $integrations.filter(integration => helpers.isSQL({ source: integration.name })).reverse() as integration}
      <DatasourceOption
        on:click={() => externalDatasourceModal.show(integration)}
        title={integration.friendlyName}
        {disabled}
        large
      >
        <IntegrationIcon
          integrationType={integration.name}
          schema={integration}
          size="32"
        />
      </DatasourceOption>
    {/each}
  </div>
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
