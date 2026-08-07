<script>
import { Body, Button, Heading, Layout, notifications } from "@supertoolmake/bbui"
import { cloneDeep } from "lodash/fp"
import { onMount } from "svelte"
import KeyValueBuilder from "@/components/integration/KeyValueBuilder.svelte"
import RestAuthenticationBuilder from "@/routes/builder/workspace/[application]/data/datasource/[datasourceId]/_components/panels/Authentication/RestAuthenticationBuilder.svelte"
import { workspaceApis } from "@/stores/builder"

let config = {}
let originalConfig = {}
let initialized = false
let saving = false

const updateConfig = (updates) => {
  config = { ...config, ...updates }
}

const updateStaticVariables = (entries) => {
  const variables = entries.reduce((result, entry) => {
    const name = `${entry?.name || ""}`.trim()
    const value = `${entry?.value || ""}`.trim()
    if (name || value) {
      result[name] = entry.value
    }
    return result
  }, {})
  updateConfig({ staticVariables: variables })
}

const save = async () => {
  saving = true
  try {
    await workspaceApis.save(config)
    originalConfig = cloneDeep(config)
    notifications.success("API settings saved successfully")
  } catch (error) {
    notifications.error(`Error saving API settings: ${error.message}`)
  } finally {
    saving = false
  }
}

onMount(async () => {
  try {
    await workspaceApis.fetch()
    config = cloneDeep($workspaceApis.datasource.config || {})
    originalConfig = cloneDeep(config)
    initialized = true
  } catch (error) {
    notifications.error(`Error loading API settings: ${error.message}`)
  }
})

$: hasChanges = initialized && JSON.stringify(config) !== JSON.stringify(originalConfig)
</script>

<Layout noPadding gap="L">
  <Layout noPadding gap="XS">
    <Heading size="S">Authentication</Heading>
    <Body size="S">Authentication configurations are available to every REST API query.</Body>
    <RestAuthenticationBuilder
      authConfigs={config.authConfigs || []}
      on:change={(event) => updateConfig({ authConfigs: event.detail })}
    />
  </Layout>

  <Layout noPadding gap="XS">
    <Heading size="S">Variables</Heading>
    <Body size="S">Static variables are available to every REST API query.</Body>
    {#if initialized}
      <KeyValueBuilder
        object={config.staticVariables || {}}
        on:change={(event) => updateStaticVariables(event.detail)}
      />
    {/if}
  </Layout>

  <div class="actions">
    <Button cta disabled={!hasChanges || saving} on:click={save}>Save</Button>
  </div>
</Layout>

<style>
  .actions {
    display: flex;
    justify-content: flex-end;
  }
</style>
