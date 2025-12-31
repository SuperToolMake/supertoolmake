<script lang="ts">
  import { Modal } from "@budibase/bbui"
  import DuplicateAppModal from "./DuplicateAppModal.svelte"
  import ExportAppModal from "./ExportAppModal.svelte"
  import type { EnrichedApp } from "@/types"

  export let app: EnrichedApp

  let exportPublishedVersion = false

  let exportModal: Modal
  let duplicateModal: Modal

  export const showDuplicateModal = () => {
    duplicateModal.show()
  }

  export const showExportDevModal = () => {
    exportPublishedVersion = false
    exportModal.show()
  }

  export const showExportProdModal = () => {
    exportPublishedVersion = true
    exportModal.show()
  }
</script>

<Modal bind:this={exportModal}>
  <ExportAppModal appId={app.devId || ""} published={exportPublishedVersion} />
</Modal>

<Modal bind:this={duplicateModal}>
  <DuplicateAppModal appId={app.devId || ""} appName={app?.name} />
</Modal>
