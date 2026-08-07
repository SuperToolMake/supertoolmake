<script lang="ts">
import {
  Body,
  Divider,
  Heading,
  Input,
  keepOpen,
  Link,
  ModalContent,
  notifications,
  Select,
} from "@supertoolmake/bbui"
import type { InsertOAuth2ConfigRequest } from "@supertoolmake/types"
import { OAuth2CredentialsMethod, OAuth2GrantType } from "@supertoolmake/types"
import { oauth2 } from "@/stores/builder"
import type { OAuth2Config } from "@/types"

export let config: OAuth2Config | undefined = undefined

interface OAuth2Form {
  name?: string
  url?: string
  clientId?: string
  clientSecret?: string
  method?: OAuth2CredentialsMethod
  grantType?: OAuth2GrantType
  scope?: string
}

let errors: Record<string, string> = {}
let data: OAuth2Form = {
  method: OAuth2CredentialsMethod.HEADER,
  grantType: OAuth2GrantType.CLIENT_CREDENTIALS,
}

$: if (config) {
  data = {
    ...config,
    method: config.method ?? OAuth2CredentialsMethod.HEADER,
    grantType: config.grantType ?? OAuth2GrantType.CLIENT_CREDENTIALS,
  }
}

const methods = [
  { label: "Basic", value: OAuth2CredentialsMethod.HEADER },
  { label: "POST", value: OAuth2CredentialsMethod.BODY },
]

const buildConfig = (): InsertOAuth2ConfigRequest => ({
  name: data.name?.trim() || "",
  url: data.url?.trim() || "",
  clientId: data.clientId?.trim() || "",
  clientSecret: data.clientSecret?.trim() || "",
  method: data.method ?? OAuth2CredentialsMethod.HEADER,
  grantType: data.grantType ?? OAuth2GrantType.CLIENT_CREDENTIALS,
  scope: data.scope?.trim() || undefined,
})

const validateConfig = (configData: InsertOAuth2ConfigRequest) => {
  errors = {}

  if (!configData.name) {
    errors.name = "Name is required."
  } else if (
    $oauth2.configs.some(
      (existing) =>
        existing._id !== config?._id &&
        existing.name.toLowerCase() === configData.name.toLowerCase()
    )
  ) {
    errors.name = "This name is already taken."
  }
  if (!configData.url) {
    errors.url = "URL is required."
  } else {
    try {
      new URL(configData.url)
    } catch {
      errors.url = "URL must be valid."
    }
  }
  if (!configData.clientId) errors.clientId = "Client ID is required."
  if (!configData.clientSecret) errors.clientSecret = "Client secret is required."

  return Object.keys(errors).length === 0
}

const saveOAuth2Config = async () => {
  const configData = buildConfig()
  if (!validateConfig(configData)) return keepOpen

  try {
    const validation = await oauth2.validate({
      _id: config?._id,
      ...configData,
    })
    if (!validation.valid) {
      const message = validation.message
        ? `Connection settings could not be validated: ${validation.message}`
        : "Connection settings could not be validated"
      notifications.error(message)
      return keepOpen
    }

    if (config) {
      await oauth2.edit({ ...configData, _id: config._id, _rev: config._rev })
      notifications.success("Settings saved.")
    } else {
      await oauth2.create(configData)
      notifications.success("Settings created.")
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    notifications.error(`Failed to save config: ${message}`)
    return keepOpen
  }
}
</script>

<ModalContent
  title={config ? "Edit OAuth2 connection" : "Create new OAuth2 connection"}
  onConfirm={saveOAuth2Config}
  size="M"
>
  <Heading size="S">{config ? "Edit OAuth2 connection" : "Create new OAuth2 connection"}</Heading>
  <Body size="S">
    The OAuth 2 authentication below uses the Client Credentials grant type.
    <Link href="https://docs.budibase.com/docs/rest-oauth2" target="_blank" size="M">
      Learn more
    </Link>
  </Body>
  <Divider noGrid noMargin />
  <Input label="Name*" placeholder="Type here..." bind:value={data.name} error={errors.name} />
  <Select
    label="Authentication method*"
    options={methods}
    getOptionLabel={option => option.label}
    getOptionValue={option => option.value}
    bind:value={data.method}
    error={errors.method}
  />
  <Select
    label="Grant type*"
    options={[{ label: "Client credentials", value: OAuth2GrantType.CLIENT_CREDENTIALS }]}
    bind:value={data.grantType}
    error={errors.grantType}
    disabled
  />
  <Input
    label="Service URL*"
    placeholder="E.g. https://example.com/oauth/token"
    bind:value={data.url}
    error={errors.url}
  />
  <Input label="Client ID*" bind:value={data.clientId} error={errors.clientId} />
  <Input
    type="password"
    label="Client secret*"
    bind:value={data.clientSecret}
    error={errors.clientSecret}
  />
  <Input
    label="Scope"
    placeholder="Space-separated scopes (optional)"
    bind:value={data.scope}
    error={errors.scope}
  />
</ModalContent>
