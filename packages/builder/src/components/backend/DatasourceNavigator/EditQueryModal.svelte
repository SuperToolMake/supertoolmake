<script>
import { Input, Modal, ModalContent, notifications } from "@supertoolmake/bbui"
import { cloneDeep } from "lodash/fp"
import { queries } from "@/stores/builder"

const { query } = $props()

let editorModal
let editQueryNameModal
let error = $state("")
let originalName = $state("")
let updatedName = $state("")

export const show = () => {
  editorModal?.show()
}

const save = async () => {
  try {
    const updatedQuery = cloneDeep(query)
    updatedQuery.name = updatedName
    await queries.save(updatedQuery.datasourceId, updatedQuery)
    notifications.success("Query renamed successfully")
  } catch {
    notifications.error("Error renaming query")
  }
}

const checkValid = (evt) => {
  const queryName = evt.target.value || ""
  error = queryName.trim() ? "" : "Query name is required."
}

const initForm = () => {
  originalName = String(query.name)
  updatedName = String(query.name)
  error = ""
}
</script>

<Modal bind:this={editorModal} on:show={initForm}>
  <ModalContent
    bind:this={editQueryNameModal}
    title="Edit Query"
    confirmText="Save"
    onConfirm={save}
    disabled={updatedName === originalName || !!error}
  >
    <form
      onsubmit={event => {
        event.preventDefault()
        editQueryNameModal.confirm()
      }}
    >
      <Input
        label="Query Name"
        thin
        bind:value={updatedName}
        on:input={checkValid}
        {error}
      />
    </form>
  </ModalContent>
</Modal>
