<script>
import { ActionButton, notifications } from "@budibase/bbui"
import { createEventDispatcher } from "svelte"

import { datasources, tables as tablesStore } from "@/stores/builder"
import CreateEditRelationshipModal from "../../Datasources/CreateEditRelationshipModal.svelte"

export let table
const dispatch = createEventDispatcher()

const findDatasource = (tableId) => {
  return $datasources.list.find((datasource) => {
    return (
      Object.values(datasource.entities || {}).find((entity) => {
        return entity._id === tableId
      }) != null
    )
  })
}

const afterSave = ({ action }) => {
  notifications.success(`Relationship ${action} successfully`)
  dispatch("updatecolumns")
}

const onError = (err) => {
  if (err.err) {
    err = err.err
  }
  notifications.error(`Error saving relationship info: ${err?.message || JSON.stringify(err)}`)
}

$: datasource = findDatasource(table?._id)
$: tables = datasource?.plus
  ? $tablesStore.list.filter((tbl) => tbl.sourceId === datasource._id)
  : []

let modal
</script>

{#if datasource}
  <div>
    <ActionButton
      icon="database"
      primary
      quiet
      on:click={() => modal.show({ fromTable: table })}
    >
      Define relationship
    </ActionButton>
  </div>
  <CreateEditRelationshipModal
    bind:this={modal}
    {datasource}
    {tables}
    {afterSave}
    {onError}
  />
{/if}
