<script lang="ts">
  import {
    ActionButton,
    Body,
    Button,
    Checkbox,
    Divider,
    Heading,
    Icon,
    Input,
    Label,
    notifications,
    Select,
  } from "@supertoolmake/bbui"
  import { Utils } from "@supertoolmake/frontend-core"
  import { ValidQueryNameRegex } from "@supertoolmake/shared-core"
  import { goto } from "@roxi/routify"
  import { cloneDeep } from "lodash/fp"
  import CodeMirrorEditor from "@/components/common/CodeMirrorEditor.svelte"
  import IntegrationQueryEditor from "@/components/integration/index.svelte"
  import BindingBuilder from "@/components/integration/QueryViewerBindingBuilder.svelte"
  import { capitalise } from "@/helpers"
  import { getErrorMessage } from "@/helpers/errors"
  import { datasources, integrations, queries } from "@/stores/builder"
  import AccessLevelSelect from "./AccessLevelSelect.svelte"
  import ConnectedQueryScreens from "./ConnectedQueryScreens.svelte"
  import ExtraQueryConfig from "./ExtraQueryConfig.svelte"
  import QueryViewerSidePanel from "./QueryViewerSidePanel/index.svelte"
  import type {
    Datasource,
    Integration,
    PreviewQueryResponse,
    Query,
    QuerySchema,
    PaginationConfig,
  } from "@supertoolmake/types"

  export let query: Query
  let queryHash = ""

  let loading = false
  let modified = false
  let scrolling = false
  let showSidePanel = false
  let nameError: string | null = null

  let newQuery: Query

  let datasource: Datasource
  let integration: Integration
  let schemaType: string

  let schema: Record<string, QuerySchema | string> = {}
  let nestedSchemaFields: Record<
    string,
    Record<string, string | QuerySchema>
  > = {}
  let rows: PreviewQueryResponse["rows"] = []

  let pagination: PaginationConfig | undefined

  const parseQuery = (query: Query) => {
    modified = false
    const foundDatasource = $datasources.list.find(
      (ds: Datasource) => ds._id === query.datasourceId
    )
    if (!foundDatasource) {
      return
    }
    datasource = foundDatasource

    const matchingIntegration = $integrations[datasource.source]
    if (!matchingIntegration) {
      return
    }
    integration = matchingIntegration
    schemaType = integration.query[query.queryVerb].type

    newQuery = cloneDeep(query)
    // init schema from the query if one already exists
    schema = newQuery.schema
    // Set the location where the query code will be written to an empty string so that it doesn't
    // get changed from undefined -> "" by the input, breaking our unsaved changes checks
    ;(newQuery.fields as Record<string, any>)[schemaType] ??= ""

    // Initialize pagination for SQL Read queries
    if (newQuery.queryVerb === "read" && schemaType === "sql") {
      if (!newQuery.fields.pagination) {
        newQuery.fields.pagination = {
          enabled: false,
          offsetBinding: "offset",
          limitBinding: "limit",
        }
      }
      pagination = newQuery.fields.pagination
    } else {
      pagination = undefined
    }

    queryHash = JSON.stringify(newQuery)
  }

  const checkIsModified = (newQuery: Query) => {
    const newQueryHash = JSON.stringify(newQuery)
    modified = newQueryHash !== queryHash

    return modified
  }

  async function runQuery({
    suppressErrors = true,
  }: { suppressErrors?: boolean } = {}) {
    try {
      showSidePanel = true
      loading = true
      const response = await queries.preview(newQuery)
      if (response.rows.length === 0) {
        notifications.info(
          "Query results empty. Please execute a query with results to create your schema."
        )
        return
      }

      nestedSchemaFields = response.nestedSchemaFields

      schema = response.schema
      rows = response.rows

      // Initialize pagination for SQL Read queries
      if (newQuery.queryVerb === "read" && schemaType === "sql") {
        if (!newQuery.fields.pagination) {
          newQuery.fields.pagination = {
            enabled: false,
            offsetBinding: "offset",
            limitBinding: "limit",
          }
        }
        pagination = newQuery.fields.pagination
      } else {
        pagination = undefined
      }

      notifications.success("Query executed successfully")
    } catch (error) {
      notifications.error(`Query Error: ${getErrorMessage(error)}`)

      if (!suppressErrors) {
        throw error
      }
    } finally {
      loading = false
    }
  }

  async function saveQuery() {
    try {
      showSidePanel = true
      loading = true
      const response = await queries.save(newQuery.datasourceId, {
        ...newQuery,
        schema,
        nestedSchemaFields,
      })

      notifications.success("Query saved successfully")
      return response
    } catch (error) {
      notifications.error(getErrorMessage(error) || "Error saving query")
    } finally {
      loading = false
    }
  }

  function resetDependentFields() {
    if (newQuery.fields.extra) {
      newQuery.fields.extra = {} as Query["fields"]["extra"]
    }
  }

  const setPaginationField = (field: string, value: unknown) => {
    if (!newQuery.fields.pagination) {
      newQuery.fields.pagination = {
        enabled: false,
        offsetBinding: "offset",
        limitBinding: "limit",
      }
    }
    const newPagination = {
      ...newQuery.fields.pagination,
      [field]: value,
    }
    // Reassign the parent fields object to trigger Svelte reactivity
    newQuery.fields = {
      ...newQuery.fields,
      pagination: newPagination,
    }
    pagination = newQuery.fields.pagination
  }

  function populateExtraQuery(extraQueryFields: Query["fields"]["extra"]) {
    newQuery.fields.extra = extraQueryFields
  }

  const handleScroll = (e: Event) => {
    scrolling =
      e.currentTarget instanceof HTMLElement
        ? e.currentTarget.scrollTop !== 0
        : false
  }

  const handleSchemaChange = (
    newSchema?: Record<string, QuerySchema | string>
  ) => {
    if (newSchema) {
      schema = newSchema
    }
  }

  async function handleKeyDown(evt: KeyboardEvent) {
    if (evt.key === "Enter" && (evt.metaKey || evt.ctrlKey)) {
      await runQuery({ suppressErrors: false })
    }
  }

  $: parseQuery(query)

  const debouncedCheckIsModified = Utils.debounce(checkIsModified, 1000)

  $: debouncedCheckIsModified(newQuery)
</script>

<svelte:window on:keydown={handleKeyDown} />
<div class="queryViewer">
  <div class="main">
    <div class="header" class:scrolling>
      <div class="title">
        <Body size="S">
          {newQuery.name || "Untitled query"}<span class="unsaved"
            >{modified ? "*" : ""}</span
          >
        </Body>
      </div>
      <div class="controls">
        <ConnectedQueryScreens sourceId={query._id!} />
        <ActionButton
          icon="play"
          disabled={loading}
          on:click={() => runQuery()}
        >
          Run query
        </ActionButton>
        <div class="tooltip" title="Run your query to enable saving">
          <Button
            on:click={async () => {
              const response = await saveQuery()

              // When creating a new query the initally passed in query object will have no id.
              if (response?._id && !newQuery._id) {
                // Set the comparison query hash to match the new query so that the user doesn't
                // get nagged when navigating to the edit view
                queryHash = JSON.stringify(newQuery)
                $goto(`../../${response._id}`)
              }
            }}
            disabled={!!(
              loading ||
              !newQuery.name ||
              nameError ||
              rows.length === 0
            )}
            overBackground
          >
            <Icon size="S" name="floppy-disk" />
            Save
          </Button>
        </div>
      </div>
    </div>

    <div class="body" on:scroll={handleScroll}>
      <div class="bodyInner">
        <div class="configField">
          <Label>Name</Label>
          <Input
            value={newQuery.name}
            on:input={e => {
              let newValue =
                e.currentTarget instanceof HTMLInputElement
                  ? e.currentTarget.value
                  : ""
              if (newValue.match(ValidQueryNameRegex)) {
                newQuery.name = newValue.trim()
                nameError = null
              } else {
                nameError = "Invalid query name"
              }
            }}
            error={nameError || undefined}
          />
          {#if integration.query}
            <Label>Function</Label>
            <Select
              bind:value={newQuery.queryVerb}
              on:change={resetDependentFields}
              options={Object.keys(integration.query)}
              getOptionLabel={verb =>
                integration.query[verb]?.displayName || capitalise(verb)}
            />
            <Label>Access</Label>
            <AccessLevelSelect query={newQuery} label={undefined} />
            {#if integration?.extra && newQuery.queryVerb}
              <ExtraQueryConfig
                query={newQuery}
                {populateExtraQuery}
                config={integration.extra}
              />
            {/if}
          {/if}
        </div>

        <Divider />

        <div class="heading">
          <Heading weight="heavy" size="XS">Query</Heading>
        </div>
        <div class="copy">
          <Body size="S">
            {#if schemaType === "sql"}
              Add some SQL to query your data
            {:else if schemaType === "json"}
              Add some JSON to query your data
            {:else if schemaType === "fields"}
              Add some fields to query your data
            {:else}
              Enter your query below
            {/if}
          </Body>
        </div>
        <IntegrationQueryEditor
          noLabel
          {datasource}
          bind:query={newQuery}
          height={200}
          schema={integration.query[newQuery.queryVerb]}
        />

        <Divider />

        <div class="heading">
          <Heading weight="heavy" size="XS">Bindings</Heading>
        </div>
        <div class="copy">
          <Body size="S">
            Bindings come in two parts: the binding name, and a default/fallback
            value. These bindings can be used as Handlebars expressions
            throughout the query.
          </Body>
        </div>
        {#key newQuery.parameters}
          <BindingBuilder
            queryBindings={newQuery.parameters}
            on:change={e => {
              newQuery.parameters = e.detail.map(
                (binding: { name: string; value: string }) => {
                  return {
                    name: binding.name,
                    default: binding.value,
                  }
                }
              )
            }}
          />
        {/key}

        {#if pagination && newQuery.queryVerb === "read"}
          <Divider />
          <div class="heading">
            <Heading weight="heavy" size="XS">Pagination</Heading>
          </div>
          <div class="copy">
            <Body size="S">
              Enable pagination to support limit and offset parameters in this
              query.
            </Body>
          </div>
          <div class="pagination">
            {#key pagination.enabled}
              <Checkbox
                text="Enable pagination"
                bind:value={pagination.enabled}
                on:change={e => setPaginationField("enabled", e.detail)}
              />
            {/key}
            {#if pagination.enabled}
              <div class="pagination-inputs">
                <Input
                  label="Offset binding name"
                  placeholder="e.g., offset"
                  value={pagination.offsetBinding}
                  on:change={e => setPaginationField("offsetBinding", e.detail)}
                />
                <Input
                  label="Limit binding name"
                  placeholder="e.g., limit"
                  value={pagination.limitBinding}
                  on:change={e => setPaginationField("limitBinding", e.detail)}
                />
              </div>
            {/if}
          </div>
        {/if}

        <Divider />
        <div class="heading">
          <Heading weight="heavy" size="XS">Transformer</Heading>
        </div>
        <div class="copy">
          <Body size="S">
            Add a JavaScript function to transform the query result.
          </Body>
        </div>
        <CodeMirrorEditor
          label={undefined}
          height={200}
          value={newQuery.transformer || ""}
          resize="vertical"
          on:change={e => (newQuery.transformer = e.detail)}
        />
      </div>
    </div>
  </div>

  <div class:showSidePanel class="sidePanel">
    <QueryViewerSidePanel
      onClose={() => (showSidePanel = false)}
      onSchemaChange={handleSchemaChange}
      {rows}
      {schema}
    />
  </div>
</div>

<style>
  .unsaved {
    color: var(--grey-5);
    font-style: italic;
  }

  .queryViewer {
    height: 100%;
    margin: -28px -40px -40px -40px;
    display: flex;
    flex: 1;
  }

  .queryViewer :global(.spectrum-Divider) {
    margin: 35px 0;
  }

  .main {
    flex-grow: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .header {
    align-items: center;
    padding: 8px 10px 8px 16px;
    display: flex;
    border-bottom: 2px solid transparent;
    transition:
      border-bottom 130ms ease-out,
      background 130ms ease-out;
  }

  .header.scrolling {
    border-bottom: var(--border-light);
    background: var(--background);
  }

  .body {
    flex-grow: 1;
    overflow-y: scroll;
    padding: 23px 23px 80px;
    box-sizing: border-box;
  }

  .bodyInner {
    max-width: 520px;
    margin: auto;
  }

  .title {
    /* width 0 paired with flex-grow necessary here for the truncation to work properly*/
    width: 0;
    flex-grow: 1;
  }

  .title :global(p) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .controls {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .tooltip {
    display: inline-block;
  }

  .controls :global(button) {
    border: none;
    color: var(--grey-7);
    font-weight: 300;
  }

  .controls :global(button):hover {
    background-color: transparent;
    color: var(--ink);
  }

  .controls :global(.is-disabled) {
    pointer-events: none;
    background-color: transparent;
    color: var(--grey-3);
  }

  .controls :global(span) {
    display: flex;
    align-items: center;
  }

  .controls :global(.icon) {
    margin-right: 8px;
  }

  .configField {
    display: grid;
    grid-template-columns: 20% 1fr;
    grid-gap: var(--spacing-l);
    align-items: center;
  }

  .configField :global(label) {
    color: var(--grey-6);
  }

  .heading {
    margin-bottom: 8px;
  }

  .copy {
    margin-bottom: 14px;
  }

  .copy :global(p) {
    color: var(--grey-7);
  }

  .sidePanel {
    flex-shrink: 0;
    height: 100%;
    width: 0;
    overflow: hidden;
    transition: width 150ms;
  }

  .sidePanel :global(.panel) {
    height: 100%;
  }

  .showSidePanel {
    width: 450px;
  }

  .pagination {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-m);
  }

  .pagination-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-m);
  }
</style>
