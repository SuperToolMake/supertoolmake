<script>
import { Body, CopyInput, keepOpen, ModalContent, notifications } from "@supertoolmake/bbui"
import { onMount } from "svelte"
import { auth } from "@/stores/portal"

let apiKey = null

async function generateAPIKey() {
  try {
    apiKey = await auth.generateAPIKey()
    notifications.success("New API key generated")
  } catch {
    notifications.error("Unable to generate new API key")
  }

  return keepOpen
}

onMount(async () => {
  try {
    apiKey = await auth.fetchAPIKey()
  } catch {
    notifications.error("Unable to fetch API key")
  }
})
</script>

<ModalContent
  title="API Key"
  showSecondaryButton
  secondaryButtonText="Regenerate key"
  secondaryAction={generateAPIKey}
  showCancelButton={false}
  confirmText="Close"
>
  <Body size="S">Your API key for accessing the SuperToolMake public API:</Body>
  <CopyInput bind:value={apiKey} />
</ModalContent>
