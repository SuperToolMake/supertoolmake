<script lang="ts">
import { Modal } from "@supertoolmake/bbui"
import type { EnrichedApp } from "@/types"
import ExportAppModal from "./ExportAppModal.svelte"

export let app: EnrichedApp

let exportPublishedVersion = false

let exportModal: Modal

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
