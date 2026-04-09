<script>
import { Button, Input, Label, Layout, notifications, ProgressCircle } from "@supertoolmake/bbui"
import { writable } from "svelte/store"
import { admin } from "@/stores/portal/admin"
import { organisation } from "@/stores/portal/organisation"

const values = writable({
  isSSOEnforced: $organisation.isSSOEnforced,
  company: $organisation.company,
  platformUrl: $organisation.platformUrl,
})

let loading = false

async function saveConfig() {
  loading = true

  try {
    const config = {
      isSSOEnforced: $values.isSSOEnforced,
      company: $values.company ?? "",
      platformUrl: $values.platformUrl ?? "",
    }

    // Update settings
    await organisation.save(config)
  } catch {
    notifications.error("Error saving org config")
  }
  loading = false
}
</script>

<Layout noPadding gap="S">
  <div class="fields">
    <div class="field">
      <Label size="L">Org. name</Label>
      <Input thin bind:value={$values.company} />
    </div>

    {#if !$admin.cloud}
      <div class="field">
        <Label
          size="L"
          tooltip={"Update the Platform URL to match your SuperToolMake web URL. This keeps email templates and authentication configs up to date."}
        >
          Platform URL
        </Label>
        <Input thin bind:value={$values.platformUrl} />
      </div>
    {/if}
  </div>
  <div>
    <Button disabled={loading} on:click={saveConfig} cta>
      {#if loading}
        <div class="save-loading">
          <ProgressCircle overBackground={true} size="S" />
        </div>
      {:else}
        Save
      {/if}
    </Button>
  </div>
</Layout>

<style>
  .fields {
    display: grid;
    grid-gap: var(--spacing-m);
    max-width: 70%;
  }
  .field {
    display: grid;
    grid-template-columns: 120px 1fr;
    grid-gap: var(--spacing-l);
    align-items: center;
  }
  .save-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 52px;
  }
</style>
