<script>
import { Button, notifications } from "@supertoolmake/bbui"
import { isEqual } from "lodash"
import { integrations } from "@/stores/builder"

export let datasource
export let updatedDatasource
export let onSaved
export let isDirty

const save = async () => {
  try {
    await integrations.saveDatasource(updatedDatasource)
    notifications.success(`Datasource ${updatedDatasource.name} updated successfully`)
    onSaved?.()
  } catch (error) {
    notifications.error(`Error saving datasource: ${error.message}`)
  }
}

$: hasChanged = typeof isDirty === "boolean" ? isDirty : !isEqual(datasource, updatedDatasource)
</script>

<Button disabled={!hasChanged} cta on:click={save}>Save</Button>
