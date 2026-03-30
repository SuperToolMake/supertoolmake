<script>
import {
  ActionButton,
  Button,
  Input,
  List,
  ListItem,
  Modal,
  ModalContent,
  notifications,
} from "@budibase/bbui"
import { getContext } from "svelte"
import DetailPopover from "@/components/common/DetailPopover.svelte"
import { rowActions } from "@/stores/builder"

const { datasource } = getContext("grid")

let popover
let createModal
let newName

const showCreateModal = () => {
  newName = null
  popover.hide()
  createModal.show()
}

const createRowAction = async () => {
  try {
    await rowActions.createRowAction(tableId, newName)
    notifications.success("Row action created successfully")
  } catch (error) {
    console.error(error)
    notifications.error("Error creating row action")
  }
}

$: ds = $datasource
$: tableId = ds?.tableId
$: tableRowActions = $rowActions[tableId] || []
$: actionCount = tableRowActions.length
$: newNameInvalid = newName && tableRowActions.some((x) => x.name === newName)
</script>

<DetailPopover title="Row actions" bind:this={popover}>
  <svelte:fragment slot="anchor" let:open>
    <ActionButton
      icon="cursor-click"
      selected={open || actionCount}
      quiet
      accentColor="#4b75ff"
    >
      Row actions{actionCount ? `: ${actionCount}` : ""}
    </ActionButton>
  </svelte:fragment>
  A row action is a reusable action for a chosen row.
  {#if !tableRowActions.length}
    You haven't created any row actions.
  {:else}
    <List>
      {#each tableRowActions as action}
        <ListItem title={action.name} />
      {/each}
    </List>
  {/if}
  <div>
    <Button secondary icon="cursor-click" on:click={showCreateModal}>
      Create row action
    </Button>
  </div>
</DetailPopover>

<Modal bind:this={createModal}>
  <ModalContent
    size="S"
    title="Create row action"
    confirmText="Create"
    showCancelButton={false}
    showDivider={false}
    showCloseIcon={false}
    disabled={!newName || newNameInvalid}
    onConfirm={createRowAction}
    let:loading
  >
    <Input
      label="Name"
      bind:value={newName}
      error={newNameInvalid && !loading
        ? "A row action with this name already exists"
        : null}
    />
  </ModalContent>
</Modal>
