<script lang="ts">
import { ActionMenu, Icon, MenuItem, Modal, notifications } from "@supertoolmake/bbui"
import ConfirmDialog from "@/components/common/ConfirmDialog.svelte"
import { oauth2 } from "@/stores/builder"
import type { OAuth2Config } from "@/types"
import OAuth2ConfigModalContent from "./OAuth2ConfigModalContent.svelte"

export let row: OAuth2Config

let modal: Modal
let deleteModal: ConfirmDialog

const onEdit = () => modal.show()

const onDelete = () => deleteModal.show()

const deleteConfig = async () => {
  try {
    await oauth2.delete(row._id, row._rev)
    notifications.success(`Config '${row.name}' deleted successfully`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    notifications.error(`Error deleting config: ${message}`)
  }
}
</script>

<ActionMenu align="right">
  <div slot="control" class="control icon">
    <Icon size="S" hoverable name="dots-three" />
  </div>
  <MenuItem on:click={onEdit} icon="pencil">Edit</MenuItem>
  <MenuItem on:click={onDelete} icon="trash">Delete</MenuItem>
</ActionMenu>

<Modal bind:this={modal}>
  <OAuth2ConfigModalContent config={{ ...row }} />
</Modal>
<ConfirmDialog
  bind:this={deleteModal}
  title="Confirm Deletion"
  body={`Deleting "${row.name}" cannot be undone. Are you sure?`}
  okText="Delete Configuration"
  warning
  onOk={deleteConfig}
/>
