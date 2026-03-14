<script lang="ts">
import { Body, keepOpen, Layout, ModalContent } from "@budibase/bbui"
import type { UIIntegration } from "@budibase/types"
import { SourceName } from "@budibase/types"
import { get } from "svelte/store"
import InfoDisplay from "@/routes/builder/workspace/[application]/design/[workspaceAppId]/[screenId]/[componentId]/_components/Component/InfoDisplay.svelte"
import ConfigInput from "./ConfigInput.svelte"
import { createValidatedConfigStore } from "./stores/validatedConfig"
import { createValidatedNameStore } from "./stores/validatedName"

const CONNECTION_TYPE = "connection"

export let integration: UIIntegration
export let config: Record<string, any>
export let onSubmit: (_value: {
  config: Record<string, any>
  name: string
}) => Promise<void> | void = () => {}
export let showNameField: boolean = false
export let nameFieldValue: string = ""
export let defaultHideConnectionUrl: boolean | undefined = false

$: configStore = createValidatedConfigStore(integration, config)
$: nameStore = createValidatedNameStore(nameFieldValue, showNameField)

$: connectionFields = ($configStore.validatedConfig as any[]).filter(
  (f) => f.type === CONNECTION_TYPE
)
$: regularFields = ($configStore.validatedConfig as any[]).filter((f) => f.type !== CONNECTION_TYPE)

const parseConnectionString = (connStr: string) => {
  try {
    const url = new URL(connStr)
    return {
      host: url.hostname || "",
      port: url.port ? parseInt(url.port) : 5432,
      database: url.pathname.replace("/", "") || "postgres",
      user: url.username || "",
      password: url.password || "",
    }
  } catch {
    return null
  }
}

const buildConnectionString = (cfg: Record<string, any>) => {
  const { host, port, database, user, password } = cfg
  if (!host) return ""
  const encUser = encodeURIComponent(user || "")
  const encPass = encodeURIComponent(password || "")
  const encDb = encodeURIComponent(database || "postgres")
  return `postgresql://${encUser}:${encPass}@${host}:${port || 5432}/${encDb}`
}

let updatingFromDirectConnection = false

const handleDirectConnectionChange = (value: string) => {
  if (!value) {
    configStore.updateFieldValue("directConnection", "")
    return
  }
  const parsed = parseConnectionString(value)
  if (parsed) {
    updatingFromDirectConnection = true
    configStore.updateFieldValue("host", parsed.host)
    configStore.updateFieldValue("port", parsed.port)
    configStore.updateFieldValue("database", parsed.database)
    configStore.updateFieldValue("user", parsed.user)
    configStore.updateFieldValue("password", parsed.password)
    configStore.updateFieldValue("directConnection", value)
    setTimeout(() => {
      updatingFromDirectConnection = false
    }, 0)
  }
}

const handleFieldChange = (key: string, value: any) => {
  if (key === "directConnection" && integration.name === SourceName.POSTGRES) {
    handleDirectConnectionChange(value)
    return
  }
  configStore.updateFieldValue(key, value)

  if (integration.name === SourceName.POSTGRES && !updatingFromDirectConnection) {
    const cfg = get(configStore).config
    const connStr = buildConnectionString(cfg)
    const currentDirectConnection = cfg?.directConnection
    if (connStr && connStr !== currentDirectConnection && cfg?.host) {
      configStore.updateFieldValue("directConnection", connStr)
    }
  }
}

const handleParsedFields = (key: string, parsed: any) => {
  if (key === "directConnection" && integration.name === SourceName.POSTGRES) {
    updatingFromDirectConnection = true
    configStore.updateFieldValue("host", parsed.host)
    configStore.updateFieldValue("port", parsed.port)
    configStore.updateFieldValue("database", parsed.database)
    configStore.updateFieldValue("user", parsed.user)
    configStore.updateFieldValue("password", parsed.password)
    setTimeout(() => {
      updatingFromDirectConnection = false
    }, 0)
  }
}

const handleConfirm = async () => {
  configStore.markAllFieldsActive()
  nameStore.markActive()

  if ((await configStore.validate()) && (await nameStore.validate())) {
    const { config } = get(configStore)
    const { name } = get(nameStore)
    return onSubmit({
      config,
      name,
    })
  }

  return keepOpen
}
</script>

<ModalContent
  title={`Connect to ${integration.friendlyName}`}
  onConfirm={handleConfirm}
  confirmText={integration.plus ? "Connect" : "Save and continue to query"}
  cancelText="Back"
  disabled={$configStore.preventSubmit || $nameStore.preventSubmit}
  size="L"
>
  {#if connectionFields.length > 0}
    {#each connectionFields as { type, key, value, error, name, config, placeholder }}
      <ConfigInput
        {type}
        {value}
        {error}
        {name}
        {config}
        {placeholder}
        {defaultHideConnectionUrl}
        on:blur={() => configStore.markFieldActive(key)}
        on:change={e => handleFieldChange(key, e.detail)}
        on:parsed={e => handleParsedFields(key, e.detail)}
        on:nestedFieldBlur={e =>
          configStore.markFieldActive(`${key}.${e.detail}`)}
      />
    {/each}
  {/if}

  <Layout noPadding>
    <Body size="XS">
      {#if integration.warningMessage}
        <InfoDisplay
          body={integration.warningMessage}
          warning={true}
          icon="warning"
        />
      {/if}
    </Body>
  </Layout>

  {#if showNameField}
    <ConfigInput
      type="string"
      value={$nameStore.name}
      error={$nameStore.error}
      name="Name"
      on:blur={nameStore.markActive}
      on:change={e => nameStore.updateValue(e.detail)}
    />
  {/if}

  {#each regularFields as { type, key, value, error, name, config, placeholder }}
    <ConfigInput
      {type}
      {value}
      {error}
      {name}
      {config}
      {placeholder}
      on:blur={() => configStore.markFieldActive(key)}
      on:change={e => handleFieldChange(key, e.detail)}
      on:parsed={e => handleParsedFields(key, e.detail)}
      on:nestedFieldBlur={e =>
        configStore.markFieldActive(`${key}.${e.detail}`)}
    />
  {/each}
</ModalContent>
