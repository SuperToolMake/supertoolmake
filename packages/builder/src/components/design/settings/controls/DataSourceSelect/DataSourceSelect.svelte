<script>
import {
  Button,
  CoreDropzone,
  Drawer,
  DrawerContent,
  Icon,
  Layout,
  Modal,
  ModalContent,
  notifications,
  Popover,
  Select,
} from "@supertoolmake/bbui"
import { makePropSafe as safe } from "@supertoolmake/string-templates"
import { createEventDispatcher } from "svelte"
import { API } from "@/api"
import ClientBindingPanel from "@/components/common/bindings/ClientBindingPanel.svelte"
import IntegrationIcon from "@/components/backend/DatasourceNavigator/IntegrationIcon.svelte"
import QueryVerbBadge from "@/components/common/QueryVerbBadge.svelte"
import { TableNames } from "@/constants"
import { IntegrationTypes } from "@/constants/backend"
import DataSourceCategory from "@/components/design/settings/controls/DataSourceSelect/DataSourceCategory.svelte"
import IntegrationQueryEditor from "@/components/integration/index.svelte"
import BindingBuilder from "@/components/integration/QueryBindingBuilder.svelte"
import { readableToRuntimeBinding, runtimeToReadableBinding } from "@/dataBinding"
import { extractFields, extractJSONArrayFields, extractRelationships } from "@/helpers/bindings"
import { findAllComponents } from "@/helpers/components"
import { customQueryIconColor, customQueryIconText } from "@/helpers/data/utils"
import { sortAndFormat } from "@/helpers/data/format"
import {
  componentStore,
  datasources,
  integrations,
  queries as queriesStore,
  selectedScreen,
  tables as tablesStore,
} from "@/stores/builder"

export let value = {}
export let otherSources
export let showAllQueries
export let bindings = []
export let showDataProviders = true

const dispatch = createEventDispatcher()

let anchorRight, dropdownRight
let drawer
let tmpQueryParams
let tmpCustomData
let modal

const handleSelected = (selected) => {
  dispatch("change", selected)
  dropdownRight.hide()
}

const fetchQueryDefinition = (query) => {
  const source = $datasources.list.find((ds) => ds._id === query.datasourceId).source
  return $integrations[source].query[query.queryVerb]
}

const getQueryParams = (query) => {
  return $queriesStore.list.find((q) => q._id === query?._id)?.parameters || []
}

const getQueryDatasource = (query) => {
  return $datasources.list.find((ds) => ds._id === query?.datasourceId)
}

const getSelectedIcon = (entry, datasourceList, tableList) => {
  if (entry?.type === "custom") {
    return {
      component: Icon,
      props: { name: "brackets-curly", size: "L" },
    }
  }

  if (entry?.type === "table") {
    if (entry.tableId === TableNames.USERS) {
      return {
        component: Icon,
        props: { name: "users-three", size: "L" },
      }
    }

    const table = tableList.find((table) => table._id === entry.tableId)
    const datasourceId = entry.datasourceId || table?.sourceId || table?.datasourceId
    const datasource = datasourceList.find((ds) => ds._id === datasourceId)
    if (datasource) {
      return {
        component: IntegrationIcon,
        props: {
          integrationType: datasource.source,
          schema: datasource.schema,
          iconUrl: datasource.config?.iconUrl,
          size: "22",
        },
      }
    }
  }

  if (entry?.type === "query") {
    const datasource = datasourceList.find((ds) => ds._id === entry.datasourceId)
    if (datasource?.source === IntegrationTypes.REST) {
      return {
        component: QueryVerbBadge,
        props: {
          verb: customQueryIconText(entry),
          color: customQueryIconColor(entry),
        },
      }
    }

    if (
      datasource?.source === IntegrationTypes.POSTGRES ||
      datasource?.source === IntegrationTypes.MYSQL ||
      datasource?.source === IntegrationTypes.SQL_SERVER
    ) {
      return {
        component: Icon,
        props: {
          name: "file-sql",
          size: "L",
          color: "var(--spectrum-global-color-gray-700)",
        },
      }
    }

    if (datasource) {
      return {
        component: IntegrationIcon,
        props: {
          integrationType: datasource.source,
          schema: datasource.schema,
          iconUrl: datasource.config?.iconUrl,
          size: "22",
        },
      }
    }

    return {
      component: Icon,
      props: {
        name: "file-magnifying-glass",
        size: "L",
        color: "var(--spectrum-global-color-gray-800)",
      },
    }
  }
}

const openQueryParamsDrawer = () => {
  tmpQueryParams = { ...value.queryParams }
  drawer.show()
}

const openCustomDrawer = () => {
  tmpCustomData = runtimeToReadableBinding(bindings, value.data || "")
  drawer.show()
}

const getQueryValue = (queries) => {
  return queries.find((q) => q._id === value._id) || value
}

const saveQueryParams = () => {
  handleSelected({
    ...value,
    queryParams: tmpQueryParams,
  })
  drawer.hide()
}

const saveCustomData = () => {
  handleSelected({
    ...value,
    data: readableToRuntimeBinding(bindings, tmpCustomData),
  })
  drawer.hide()
}

const promptForCSV = () => {
  drawer.hide()
  modal.show()
}

const handleCSV = async (e) => {
  try {
    const csv = await e.detail[0]?.text()
    if (csv?.length) {
      const js = await API.csvToJson(csv)
      tmpCustomData = JSON.stringify(js)
    }
    modal.hide()
    saveCustomData()
  } catch {
    notifications.error("Failed to parse CSV")
    modal.hide()
    drawer.show()
  }
}

$: text = value?.label ?? "Choose an option"
$: selectedIcon = getSelectedIcon(value, $datasources.list, $tablesStore.list)
$: isSelectedRestQuery =
  value?.type === "query" &&
  $datasources.list.find((datasource) => datasource._id === value.datasourceId)?.source ===
    IntegrationTypes.REST
$: tables = sortAndFormat.tables($tablesStore.list, $datasources.list)
$: queries = $queriesStore.list
  .filter((q) => showAllQueries || q.queryVerb === "read" || q.readable)
  .map((query) => ({
    label: query.name,
    name: query.name,
    ...query,
    type: "query",
  }))
$: dataProviders = findAllComponents($selectedScreen.props)
  .filter((component) => {
    return (
      component._component?.endsWith("/dataprovider") &&
      component._id !== $componentStore.selectedComponentId
    )
  })
  .map((provider) => ({
    label: provider._instanceName,
    name: provider._instanceName,
    providerId: provider._id,
    value: `{{ literal ${safe(provider._id)} }}`,
    type: "provider",
  }))
$: links = extractRelationships(bindings)
$: fields = extractFields(bindings)
$: jsonArrays = extractJSONArrayFields(bindings)
$: custom = {
  type: "custom",
  label: "JSON / CSV",
}
</script>

<div class="container" bind:this={anchorRight}>
  <div class="select">
    <Select
      readonly
      value={text}
      options={[text]}
      on:click={dropdownRight.show}
    />
  </div>
  {#if value?.type === "query" || selectedIcon}
    <div class="icon">
      {#if isSelectedRestQuery}
        <Icon hoverable name="gear" on:click={openQueryParamsDrawer} />
      {:else if selectedIcon}
        <svelte:component this={selectedIcon.component} {...selectedIcon.props} />
      {/if}
    </div>
  {/if}
  {#if value?.type === "query"}
      <Drawer title={"Query Bindings"} bind:this={drawer}>
      <Button slot="buttons" cta on:click={saveQueryParams}>Save</Button>
      <DrawerContent slot="body">
        <Layout noPadding gap="XS">
          {#if getQueryParams(value).length > 0}
            <BindingBuilder
              customParams={tmpQueryParams}
              on:change={v => {
                tmpQueryParams = { ...v.detail }
              }}
              queryBindings={getQueryParams(value)}
              bind:bindings
            />
          {/if}
          <IntegrationQueryEditor
            height={200}
            query={getQueryValue(queries)}
            schema={fetchQueryDefinition(value)}
            datasource={getQueryDatasource(value)}
            editable={false}
          />
        </Layout>
      </DrawerContent>
      </Drawer>
  {/if}
  {#if value?.type === "custom"}
    <Drawer title="Custom data" bind:this={drawer}>
      <div slot="buttons" style="display:contents">
        <Button primary on:click={promptForCSV}>Load CSV</Button>
        <Button cta on:click={saveCustomData}>Save</Button>
      </div>
      <div slot="description">Provide a JSON array to use as data</div>
      <ClientBindingPanel
        slot="body"
        value={tmpCustomData}
        on:change={event => (tmpCustomData = event.detail)}
        {bindings}
        allowJS
        allowHelpers
      />
    </Drawer>
  {/if}
</div>
<Popover bind:this={dropdownRight} anchor={anchorRight}>
  <div class="dropdown">
    <DataSourceCategory
      heading="Tables"
      dataSet={tables}
      {value}
      onSelect={handleSelected}
    />
    {#if queries?.length}
      <DataSourceCategory
        dividerState={true}
        heading="Queries"
        dataSet={queries}
        {value}
        onSelect={handleSelected}
        identifiers={["_id"]}
      />
    {/if}
    {#if links?.length}
      <DataSourceCategory
        dividerState={true}
        heading="Relationships"
        dataSet={links}
        {value}
        onSelect={handleSelected}
        identifiers={["tableId", "fieldName"]}
      />
    {/if}
    {#if fields?.length}
      <DataSourceCategory
        dividerState={true}
        heading="Fields"
        dataSet={fields}
        {value}
        onSelect={handleSelected}
        identifiers={["providerId", "tableId", "fieldName"]}
      />
    {/if}
    {#if jsonArrays?.length}
      <DataSourceCategory
        dividerState={true}
        heading="JSON Arrays"
        dataSet={jsonArrays}
        {value}
        onSelect={handleSelected}
        identifiers={["providerId", "tableId", "fieldName"]}
      />
    {/if}
    {#if showDataProviders && dataProviders?.length}
      <DataSourceCategory
        dividerState={true}
        heading="Data Providers"
        dataSet={dataProviders}
        {value}
        onSelect={handleSelected}
        identifiers={["providerId"]}
      />
    {/if}
    <DataSourceCategory
      dividerState={true}
      heading="Other"
      dataSet={[custom]}
      {value}
      onSelect={handleSelected}
    />
    {#if otherSources?.length}
      <DataSourceCategory
        dividerState={false}
        dataSet={otherSources}
        {value}
        onSelect={handleSelected}
      />
    {/if}
  </div>
</Popover>

<Modal bind:this={modal}>
  <ModalContent title="Load CSV" showConfirmButton={false}>
    <CoreDropzone compact extensions=".csv" on:change={handleCSV} />
  </ModalContent>
</Modal>

<style>
  .container {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
  }
  .select {
    flex: 1 1 auto;
    min-width: 0;
  }

  .dropdown {
    padding: var(--spacing-m) 0;
    z-index: 99999999;
  }

  .icon {
    margin-left: 8px;
  }
</style>
