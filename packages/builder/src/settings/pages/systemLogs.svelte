<script>
import { Body, Button, Layout } from "@supertoolmake/bbui"
import { downloadStream } from "@supertoolmake/frontend-core"
import { API } from "@/api"
import Spinner from "@/components/common/Spinner.svelte"

let loading = false

async function download() {
  loading = true
  try {
    await downloadStream(await API.getSystemLogs())
  } finally {
    loading = false
  }
}
</script>

<Layout noPadding>
  <Body size="S">Download your latest logs</Body>
  <div class="download-button">
    <Button cta on:click={download} disabled={loading}>
      <div class="button-content">
        {#if loading}
          <Spinner size="10" />
        {/if}
        Download
      </div>
    </Button>
  </div>
</Layout>

<style>
  .button-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-m);
  }
</style>
