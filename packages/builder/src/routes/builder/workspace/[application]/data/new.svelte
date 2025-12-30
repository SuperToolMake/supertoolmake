<script lang="ts">
  import {
    tables,
    datasources,
    sortedIntegrations as integrations,
  } from "@/stores/builder"

  import { hasData } from "@/stores/selectors"
  import { Body } from "@budibase/bbui"
  import { params, goto } from "@roxi/routify"
  import CreateExternalDatasourceModal from "./_components/CreateExternalDatasourceModal/index.svelte"
  import DatasourceOption from "./_components/DatasourceOption.svelte"
  import IntegrationIcon from "@/components/backend/DatasourceNavigator/IntegrationIcon.svelte"
  import CreationPage from "@/components/common/CreationPage.svelte"
  import { IntegrationTypes } from "@/constants/backend"

  $goto
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
  showClose={hasData($datasources, $tables)}
  onClose={() => $goto("./table")}
  heading="Add new data source"
>
  <div class="subHeading">
    <Body>Connect to an external datasource</Body>
  </div>
  <div class="options">
    {#each $integrations.filter(integration => integration.name !== IntegrationTypes.REST) as integration}
      <DatasourceOption
        on:click={() => externalDatasourceModal.show(integration)}
        title={integration.friendlyName}
        description={integration.type}
        {disabled}
      >
        <IntegrationIcon
          integrationType={integration.name}
          schema={integration}
        />
      </DatasourceOption>
    {/each}
  </div>
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
    display: grid;
    column-gap: 24px;
    row-gap: 24px;
    grid-template-columns: repeat(auto-fit, 235px);
    justify-content: center;
    margin-bottom: 48px;
    max-width: 1050px;
  }
  .options {
    grid-column: 1 / -1;
  }
</style>
