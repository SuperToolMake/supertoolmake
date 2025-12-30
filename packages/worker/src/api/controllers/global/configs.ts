import {
  BadRequestError,
  cache,
  configs,
  env as coreEnv,
  db as dbCore,
  objectStore,
  tenancy,
} from "@budibase/backend-core"
import { BUILDER_URLS } from "@budibase/shared-core"
import {
  Config,
  ConfigChecklistResponse,
  ConfigType,
  Ctx,
  DeleteConfigResponse,
  FindConfigResponse,
  GetPublicOIDCConfigResponse,
  GetPublicSettingsResponse,
  GoogleInnerConfig,
  isGoogleConfig,
  isOIDCConfig,
  isSettingsConfig,
  isSMTPConfig,
  OIDCLogosConfig,
  PASSWORD_REPLACEMENT,
  SaveConfigRequest,
  SaveConfigResponse,
  SettingsInnerConfig,
  SMTPInnerConfig,
  SSOConfig,
  SSOConfigType,
  UploadConfigFileResponse,
  UserCtx,
} from "@budibase/types"
import env from "../../../environment"
import * as email from "../../../utilities/email"
import { checkAnyUserExists } from "../../../utilities/users"
import * as auth from "./auth"

type SSOConfigs = { [key in SSOConfigType]: SSOConfig | undefined }

async function getSSOConfigs(): Promise<SSOConfigs> {
  const google = await configs.getGoogleConfig()
  const oidc = await configs.getOIDCConfig()
  return {
    [ConfigType.GOOGLE]: google,
    [ConfigType.OIDC]: oidc,
  }
}

async function hasActivatedConfig(ssoConfigs?: SSOConfigs) {
  if (!ssoConfigs) {
    ssoConfigs = await getSSOConfigs()
  }
  return !!Object.values(ssoConfigs).find(c => c?.activated)
}

async function processSMTPConfig(
  config: SMTPInnerConfig,
  existingConfig?: SMTPInnerConfig
) {
  await email.verifyConfig(config)
  if (config.auth?.pass === PASSWORD_REPLACEMENT) {
    // if the password is being replaced, use the existing password
    if (existingConfig && existingConfig.auth?.pass) {
      config.auth.pass = existingConfig.auth.pass
    } else {
      // otherwise, throw an error
      throw new BadRequestError("SMTP password is required")
    }
  }
}

async function processSettingsConfig(
  config: SettingsInnerConfig,
  existingConfig?: SettingsInnerConfig
) {
  if (config.isSSOEnforced) {
    const valid = await hasActivatedConfig()
    if (!valid) {
      throw new Error("Cannot enforce SSO without an activated configuration")
    }
  }

  // always preserve file attributes
  // these should be set via upload instead
  // only allow for deletion by checking empty string to bypass this behaviour

  if (existingConfig && config.logoUrl !== "") {
    config.logoUrl = existingConfig.logoUrl
    config.logoUrlEtag = existingConfig.logoUrlEtag
  }
}

async function verifySSOConfig(type: SSOConfigType, config: SSOConfig) {
  const settings = await configs.getSettingsConfig()
  if (settings.isSSOEnforced && !config.activated) {
    // config is being saved as deactivated
    // ensure there is at least one other activated sso config
    const ssoConfigs = await getSSOConfigs()

    // overwrite the config being updated
    // to reflect the desired state
    ssoConfigs[type] = config

    const activated = await hasActivatedConfig(ssoConfigs)
    if (!activated) {
      throw new Error(
        "Configuration cannot be deactivated while SSO is enforced"
      )
    }
  }
}

async function processGoogleConfig(
  config: GoogleInnerConfig,
  existing?: GoogleInnerConfig
) {
  await verifySSOConfig(ConfigType.GOOGLE, config)

  if (existing && config.clientSecret === PASSWORD_REPLACEMENT) {
    config.clientSecret = existing.clientSecret
  }
}

export async function save(
  ctx: UserCtx<SaveConfigRequest, SaveConfigResponse>
) {
  const body = ctx.request.body
  const type = body.type
  const config = body.config

  const existingConfig = await configs.getConfig(type)

  if (existingConfig) {
    body._rev = existingConfig._rev
  }

  try {
    switch (type) {
      case ConfigType.SMTP:
        await processSMTPConfig(config, existingConfig?.config)
        break
      case ConfigType.SETTINGS:
        await processSettingsConfig(config, existingConfig?.config)
        break
      case ConfigType.GOOGLE:
        await processGoogleConfig(config, existingConfig?.config)
        break
    }
  } catch (err: any) {
    ctx.throw(400, err)
  }

  try {
    if (existingConfig?.config) {
      const {
        emailBrandingEnabled,
        platformTitle,
        metaDescription,
        loginHeading,
        loginButton,
        metaImageUrl,
        metaTitle,
      } = existingConfig.config

      body.config = {
        ...body.config,
        emailBrandingEnabled,
        platformTitle,
        metaDescription,
        loginHeading,
        loginButton,
        metaImageUrl,
        metaTitle,
      }
    }
  } catch (e) {
    console.error("There was an issue retrieving the license", e)
  }

  try {
    body._id = configs.generateConfigID(type)
    const response = await configs.save(body)
    await cache.bustCache(cache.CacheKey.CHECKLIST)
    await cache.bustCache(cache.CacheKey.ANALYTICS_ENABLED)

    ctx.body = {
      type,
      _id: response.id,
      _rev: response.rev,
    }
  } catch (err: any) {
    ctx.throw(400, err)
  }
}

async function enrichOIDCLogos(oidcLogos: OIDCLogosConfig) {
  if (!oidcLogos) {
    return
  }
  const newConfig: Record<string, string> = {}
  const keys = Object.keys(oidcLogos.config || {})

  for (const key of keys) {
    if (!key.endsWith("Etag")) {
      const etag = oidcLogos.config[`${key}Etag`]
      const objectStoreUrl = await objectStore.getGlobalFileUrl(
        oidcLogos.type,
        key,
        etag
      )
      newConfig[key] = objectStoreUrl
    } else {
      newConfig[key] = oidcLogos.config[key]
    }
  }
  oidcLogos.config = newConfig
}

export async function find(ctx: UserCtx<void, FindConfigResponse>) {
  // Find the config with the most granular scope based on context
  const type = ctx.params.type
  let config = await configs.getConfig(type)

  if (!config) {
    ctx.body = {}
    return
  }

  switch (type) {
    case ConfigType.OIDC_LOGOS:
      await enrichOIDCLogos(config)
      break
  }

  stripSecrets(config)
  ctx.body = config
}

function stripSecrets(config: Config) {
  if (isSMTPConfig(config)) {
    if (config.config.auth?.pass) {
      config.config.auth.pass = PASSWORD_REPLACEMENT
    }
  } else if (isGoogleConfig(config)) {
    config.config.clientSecret = PASSWORD_REPLACEMENT
  } else if (isOIDCConfig(config)) {
    for (const c of config.config.configs) {
      c.clientSecret = PASSWORD_REPLACEMENT
    }
  }
}

export async function publicOidc(ctx: Ctx<void, GetPublicOIDCConfigResponse>) {
  try {
    // Find the config with the most granular scope based on context
    const oidcConfig = await configs.getOIDCConfig()
    const oidcCustomLogos = await configs.getOIDCLogosDoc()

    if (oidcCustomLogos) {
      await enrichOIDCLogos(oidcCustomLogos)
    }

    if (!oidcConfig) {
      ctx.body = []
    } else {
      ctx.body = [
        {
          logo: oidcCustomLogos?.config[oidcConfig.logo] ?? oidcConfig.logo,
          name: oidcConfig.name,
          uuid: oidcConfig.uuid,
        },
      ]
    }
  } catch (err: any) {
    ctx.throw(err.status, err)
  }
}

export async function publicSettings(
  ctx: Ctx<void, GetPublicSettingsResponse>
) {
  try {
    // settings
    const [configDoc, googleConfig] = await Promise.all([
      configs.getSettingsConfigDoc(),
      configs.getGoogleConfig(),
    ])
    const config = configDoc.config

    const getLogoUrl = () => {
      // enrich the logo url - empty url means deleted
      if (config.logoUrl && config.logoUrl !== "") {
        return objectStore.getGlobalFileUrl(
          "settings",
          "logoUrl",
          config.logoUrlEtag
        )
      }
    }

    // google
    const googleDatasourcePromise = configs.getGoogleDatasourceConfig()
    const preActivated = googleConfig && googleConfig.activated == null
    const google = preActivated || !!googleConfig?.activated
    const googleCallbackUrlPromise = auth.googleCallbackUrl(googleConfig)

    // oidc
    const oidcConfigPromise = configs.getOIDCConfig()
    const oidcCallbackUrlPromise = auth.oidcCallbackUrl()

    // performance all async work at same time, there is no need for all of these
    // operations to occur in sync, slowing the endpoint down significantly
    const [
      googleDatasource,
      googleCallbackUrl,
      oidcConfig,
      oidcCallbackUrl,
      logoUrl,
    ] = await Promise.all([
      googleDatasourcePromise,
      googleCallbackUrlPromise,
      oidcConfigPromise,
      oidcCallbackUrlPromise,
      getLogoUrl(),
    ])

    const oidc = oidcConfig?.activated || false
    const googleDatasourceConfigured = !!googleDatasource
    if (logoUrl) {
      config.logoUrl = logoUrl
    }

    ctx.body = {
      type: ConfigType.SETTINGS,
      _id: configDoc._id,
      _rev: configDoc._rev,
      config: {
        ...config,
        google,
        googleDatasourceConfigured,
        oidc,
        oidcCallbackUrl,
        googleCallbackUrl,
      },
    }
  } catch (err: any) {
    ctx.throw(err.status, err)
  }
}

export async function upload(ctx: UserCtx<void, UploadConfigFileResponse>) {
  if (ctx.request.files == null || Array.isArray(ctx.request.files.file)) {
    ctx.throw(400, "One file must be uploaded.")
  }
  const file = ctx.request.files.file as any
  const { type, name } = ctx.params

  let bucket = coreEnv.GLOBAL_BUCKET_NAME
  const key = objectStore.getGlobalFileS3Key(type, name)

  const result = await objectStore.upload({
    bucket,
    filename: key,
    path: file.path,
    type: file.type,
  })

  // add to configuration structure
  let config = await configs.getConfig(type)
  if (!config) {
    config = {
      _id: configs.generateConfigID(type),
      type,
      config: {},
    }
  }

  // save the Etag for cache bursting
  const etag = result.ETag
  if (etag) {
    config.config[`${name}Etag`] = etag.replace(/"/g, "")
  }

  // save the file key
  config.config[`${name}`] = key

  // write back to db
  await configs.save(config)

  ctx.body = {
    message: "File has been uploaded and url stored to config.",
    url: await objectStore.getGlobalFileUrl(type, name, etag),
  }
}

export async function destroy(ctx: UserCtx<void, DeleteConfigResponse>) {
  const db = tenancy.getGlobalDB()
  const { id, rev } = ctx.params
  try {
    await db.remove(id, rev)
    await cache.destroy(cache.CacheKey.CHECKLIST)
    ctx.body = { message: "Config deleted successfully" }
  } catch (err: any) {
    ctx.throw(err.status, err)
  }
}

export async function configChecklist(ctx: Ctx<void, ConfigChecklistResponse>) {
  const tenantId = tenancy.getTenantId()

  try {
    ctx.body = await cache.withCache(
      cache.CacheKey.CHECKLIST,
      env.CHECKLIST_CACHE_TTL,
      async (): Promise<ConfigChecklistResponse> => {
        let workspaces = []
        if (!env.MULTI_TENANCY || tenantId) {
          // Apps exist
          workspaces = await dbCore.getAllWorkspaces({
            idsOnly: true,
            efficient: true,
          })
        }

        // They have set up SMTP
        const smtpConfig = await configs.getSMTPConfig()

        // They have set up Google Auth
        const googleConfig = await configs.getGoogleConfig()

        // They have set up OIDC
        const oidcConfig = await configs.getOIDCConfig()

        // They have set up a global user
        const userExists = await checkAnyUserExists()

        return {
          apps: {
            checked: workspaces.length > 0,
            label: "Create your first app",
            link: BUILDER_URLS.WORKSPACES,
          },
          smtp: {
            checked: !!smtpConfig,
            label: "Set up email",
            link: BUILDER_URLS.SETTINGS_EMAIL,
            fallback: smtpConfig?.fallback || false,
          },
          adminUser: {
            checked: userExists,
            label: "Create your first user",
            link: BUILDER_URLS.SETTINGS_PEOPLE_USERS,
          },
          sso: {
            checked: !!googleConfig || !!oidcConfig,
            label: "Set up single sign-on",
            link: BUILDER_URLS.SETTINGS_AUTH,
          },
        }
      }
    )
  } catch (err: any) {
    ctx.throw(err.status, err)
  }
}
