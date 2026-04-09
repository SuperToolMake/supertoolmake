<script>
import { keepOpen, ModalContent, notifications } from "@supertoolmake/bbui"
import { createEventDispatcher } from "svelte"
import { dataAPI, tables } from "@/stores/builder"
import RowFieldControl from "../RowFieldControl.svelte"

export let row = {}

let errors = []
const dispatch = createEventDispatcher()

async function saveRow() {
  errors = []
  try {
    const res = await $dataAPI.saveRow({ ...row, tableId: table._id })
    notifications.success("Row saved successfully")
    dispatch("updaterows", res._id)
  } catch (error) {
    const response = error.json
    if (error.handled && response?.errors) {
      errors = response.errors
    } else if (error.handled && response?.validationErrors) {
      const mappedErrors = {}
      for (let field in response.validationErrors) {
        mappedErrors[field] = `${field} ${response.validationErrors[field][0]}`
      }
      errors = mappedErrors
    } else {
      notifications.error(`Failed to save row - ${error.message}`)
    }

    return keepOpen
  }
}

$: creating = row?._id == null
$: table = row.tableId ? $tables.list.find((table) => table._id === row?.tableId) : $tables.selected
$: tableSchema = Object.entries(table?.schema ?? {})
</script>

<span class="modal-wrap">
  <ModalContent
    title={creating ? "Create Row" : "Edit Row"}
    confirmText={creating ? "Create Row" : "Save Row"}
    onConfirm={saveRow}
    showCancelButton={creating}
    showSecondaryButton={!creating}
    secondaryButtonWarning={!creating}
    secondaryButtonText="Delete"
    secondaryAction={() => {
      dispatch("deleteRows", row)
    }}
  >
    {#each tableSchema as [key, meta]}
      {#if !meta.autocolumn}
        <div>
          <RowFieldControl error={errors[key]} {meta} bind:value={row[key]} />
        </div>
      {/if}
    {/each}
  </ModalContent>
</span>

<style>
  div {
    min-width: 0;
  }
  .modal-wrap :global(.secondary-action) {
    margin-right: unset;
  }
</style>
