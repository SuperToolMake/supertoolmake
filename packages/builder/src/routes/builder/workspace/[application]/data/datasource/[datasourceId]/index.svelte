<script>
import { Body, Heading, Layout, Tab, Tabs } from "@supertoolmake/bbui"
import { params } from "@roxi/routify"
import IntegrationIcon from "@/components/backend/DatasourceNavigator/IntegrationIcon.svelte"
import { IntegrationTypes } from "@/constants/backend"
import { datasources, integrations } from "@/stores/builder"
import EditDatasourceConfig from "./_components/EditDatasourceConfig.svelte"
import PromptQueryModal from "./_components/PromptQueryModal.svelte"
import QueriesPanel from "./_components/panels/Queries/index.svelte"
import RelationshipsPanel from "./_components/panels/Relationships.svelte"
import TablesPanel from "./_components/panels/Tables/index.svelte"

$params

let selectedPanel = $params.tab ?? null
let panelOptions = []

const getOptions = (datasource) => {
  if (!datasource) {
    panelOptions = []
    selectedPanel = null
    return
  }

  if (datasource.plus) {
    // Google Sheets' integration definition specifies `relationships: false` as it doesn't support relationships like other plus datasources
    panelOptions =
      $integrations[datasource.source].relationships === false
        ? ["Tables", "Queries"]
        : ["Tables", "Relationships", "Queries"]
    selectedPanel = panelOptions.includes(selectedPanel) ? selectedPanel : "Tables"
  } else {
    panelOptions = ["Queries"]
    selectedPanel = "Queries"
  }
}

$: datasource = $datasources.selected

$: getOptions(datasource)
</script>

<PromptQueryModal />

<section>
  <Layout noPadding>
    <Layout gap="XS" noPadding>
      <header>
        <IntegrationIcon
          integrationType={datasource?.source}
          schema={$integrations?.[datasource?.source]}
          size="26"
        />
        <Heading size="M">{$datasources.selected?.name}</Heading>
      </header>
    </Layout>
    {#if datasource?.source === IntegrationTypes.REST}
      <Body>REST API settings are managed in Workspace settings under APIs.</Body>
    {:else}
      <EditDatasourceConfig {datasource} />
      <div class="tabs">
        <Tabs size="L" noPadding noHorizPadding selected={selectedPanel}>
          {#each panelOptions as panelOption}
            <Tab
              title={panelOption}
              on:click={() => (selectedPanel = panelOption)}
            />
          {/each}
        </Tabs>
      </div>

      {#if selectedPanel === null}
        <Body>loading...</Body>
      {:else if selectedPanel === "Tables"}
        <TablesPanel {datasource} />
      {:else if selectedPanel === "Relationships"}
        <RelationshipsPanel {datasource} />
      {:else if selectedPanel === "Queries"}
        <QueriesPanel {datasource} />
      {:else}
        <Body>Something went wrong</Body>
      {/if}
    {/if}
  </Layout>
</section>

<style>
  section {
    margin: 0 auto;
    width: 640px;
  }

  header {
    margin-top: 35px;
    display: flex;
    gap: var(--spacing-l);
    align-items: center;
    margin-bottom: 12px;
  }

</style>
