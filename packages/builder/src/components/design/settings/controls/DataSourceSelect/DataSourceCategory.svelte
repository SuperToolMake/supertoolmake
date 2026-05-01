<script>
import { Divider, Heading, Icon } from "@supertoolmake/bbui"
import QueryVerbBadge from "@/components/common/QueryVerbBadge.svelte"
import IntegrationIcon from "@/components/backend/DatasourceNavigator/IntegrationIcon.svelte"
import { IntegrationTypes } from "@/constants/backend"
import { customQueryIconColor, customQueryIconText } from "@/helpers/data/utils"
import { datasources } from "@/stores/builder"

export let dividerState
export let heading
export let dataSet
export let value
export let onSelect
export let identifiers = ["resourceId"]

function isSelected(entry) {
  if (!identifiers.length) {
    return false
  }
  for (const identifier of identifiers) {
    if (entry[identifier] !== value?.[identifier]) {
      return false
    }
  }
  return true
}

const isRestQuery = (entry) => {
  if (entry?.type !== "query") {
    return false
  }
  const datasource = $datasources.list.find((ds) => ds._id === entry.datasourceId)
  return datasource?.source === IntegrationTypes.REST
}

const isSqlQuery = (entry) => {
  if (entry?.type !== "query") {
    return false
  }
  const datasource = $datasources.list.find((ds) => ds._id === entry.datasourceId)
  return (
    datasource?.source === IntegrationTypes.POSTGRES ||
    datasource?.source === IntegrationTypes.MYSQL ||
    datasource?.source === IntegrationTypes.SQL_SERVER
  )
}

const getDatasourceForEntry = (entry) => {
  if (entry?.type !== "query") {
    return null
  }
  return $datasources.list.find((ds) => ds._id === entry.datasourceId)
}

const shouldInclude = (entry) => {
  if (entry?.type !== "query") {
    return true
  }
  if (!isRestQuery(entry)) {
    return true
  }
  return entry.queryVerb === "create" || entry.queryVerb === "read"
}

$: displayDatasourceName = $datasources.list.length > 1

$: filteredDataSet = dataSet?.filter(shouldInclude) ?? []

$: containsRestQuery = filteredDataSet?.some((entry) => isRestQuery(entry)) ?? false

$: iconMinWidth = containsRestQuery ? "64px" : "42px"
</script>

{#if dividerState}
  <Divider />
{/if}
{#if heading}
  <div class="title">
    <Heading size="XS">{heading}</Heading>
  </div>
{/if}
<!-- svelte-ignore a11y-click-events-have-key-events -->
<ul class="spectrum-Menu" role="listbox" style="--icon-min-width: {iconMinWidth}">
  {#each filteredDataSet as data}
    <li
      class="spectrum-Menu-item"
      class:is-selected={isSelected(data) && value?.type === data.type}
      role="option"
      aria-selected="true"
      tabindex="0"
      on:click={() => onSelect(data)}
    >
      <span class="spectrum-Menu-itemLabel">
        {#if data?.type === "query"}
          <span class="query-icon">
            {#if isRestQuery(data)}
              <QueryVerbBadge
                verb={customQueryIconText(data)}
                color={customQueryIconColor(data)}
              />
            {:else if isSqlQuery(data)}
              <Icon
                name="file-sql"
                size="L"
                color="var(--spectrum-global-color-gray-700)"
              />
            {:else}
              {@const ds = getDatasourceForEntry(data)}
              {#if ds}
                <IntegrationIcon
                  integrationType={ds.source}
                  schema={ds.schema}
                  iconUrl={ds.config?.iconUrl}
                  size="22"
                />
              {:else}
                <Icon
                  name="file-magnifying-glass"
                  size="L"
                  color="var(--spectrum-global-color-gray-800)"
                />
              {/if}
            {/if}
          </span>
        {/if}
        <span class="label-text">
          {data.datasourceName && displayDatasourceName
            ? `${data.datasourceName} - `
            : ""}{data.label}
        </span>
      </span>
      <div class="check">
        <Icon name="check" />
      </div>
    </li>
  {/each}
</ul>

<style>
  .title {
    padding: 0 var(--spacing-m) var(--spacing-s) var(--spacing-m);
  }
  ul {
    list-style: none;
    padding-left: 0;
    margin: 0;
    width: 100%;
  }
  .spectrum-Menu-itemLabel {
    display: flex;
    align-items: center;
    gap: var(--spacing-s);
  }
.query-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: var(--icon-min-width, 42px);
  }
  .label-text {
    flex: 1;
  }
  .check {
    display: none;
  }
  .is-selected .check {
    display: block;
  }
</style>
