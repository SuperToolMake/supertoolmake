<script>
import { Input, Label } from "@supertoolmake/bbui"
import { IntegrationTypes } from "@/constants/backend"
import Editor from "./QueryEditor.svelte"
import FieldsBuilder from "./QueryFieldsBuilder.svelte"

const QueryTypes = {
  SQL: "sql",
  JSON: "json",
  FIELDS: "fields",
}

const DEFAULT_SQL_MODE = "sql"

const SQLModes = {
  [IntegrationTypes.MYSQL]: "text/x-mysql",
  [IntegrationTypes.POSTGRES]: "text/x-pgsql",
  [IntegrationTypes.SQL_SERVER]: "text/x-mssql",
}

export let query
export let datasource
export let schema
export let editable = true
export let height = 500
export let noLabel = false

function updateQuery({ detail }) {
  query.fields[schema.type] = detail.value
}

$: sqlEditorMode = SQLModes[datasource?.source] || DEFAULT_SQL_MODE

$: urlDisplay =
  schema.urlDisplay &&
  `${datasource.config.url}${
    query.fields.path ? `/${query.fields.path}` : ""
  }${query.fields.queryString ? `?${query.fields.queryString}` : ""}`

$: shouldDisplayJsonBox = schema.type === QueryTypes.JSON
</script>

{#if schema}
  {#key query._id}
    {#if schema.type === QueryTypes.SQL}
      <Editor
        editorHeight={height}
        label={noLabel ? null : "Query"}
        mode={sqlEditorMode}
        on:change={updateQuery}
        readOnly={!editable}
        value={query.fields.sql}
        parameters={query.parameters}
      />
    {:else if shouldDisplayJsonBox}
      <Editor
        editorHeight={height}
        label={noLabel ? null : "Query"}
        mode="json"
        on:change={updateQuery}
        readOnly={!editable}
        value={query.fields.json}
        parameters={query.parameters}
      />
    {:else if schema.type === QueryTypes.FIELDS}
      <FieldsBuilder bind:fields={query.fields} {schema} {editable} />
      {#if schema.urlDisplay}
        <div class="url-row">
          <Label small>URL</Label>
          <Input thin outline disabled value={urlDisplay} />
        </div>
      {/if}
    {/if}
  {/key}
{/if}

<style>
  .url-row {
    display: grid;
    grid-template-columns: 20% 1fr;
    grid-gap: var(--spacing-l);
    align-items: center;
  }
</style>
