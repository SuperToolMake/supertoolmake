<script>
import { Input, Modal, ModalContent, notifications } from "@budibase/bbui"
import { API } from "@/api"
import { appStore, initialise } from "@/stores/builder"

export let onComplete = () => {}

let revertModal
let appName

const revert = async () => {
  try {
    await API.revertAppChanges(appId)

    // Reset frontend state after revert
    const applicationPkg = await API.fetchAppPackage(appId)
    await initialise(applicationPkg)
    notifications.info("Changes reverted successfully")
    onComplete()
  } catch (error) {
    notifications.error(`Error reverting changes: ${error.message}`)
  }
}

export const hide = () => {
  revertModal.hide()
}

export const show = () => {
  revertModal.show()
}

$: appId = $appStore.appId
</script>

<Modal bind:this={revertModal}>
  <ModalContent
    title="Revert changes"
    confirmText="Revert"
    onConfirm={revert}
    disabled={appName !== $appStore.name}
  >
    <span>
      The changes you have made will be deleted and the workspace reverted back
      to its production state.
    </span>
    <span>Please enter your workspace name to continue.</span>
    <Input bind:value={appName} />
  </ModalContent>
</Modal>
