import { Document } from "../document"
import { User } from "./user"
import { EmailAttachment, EmailInvite } from "../../api"

export interface SendEmailOpts {
  to?: string
  // workspaceId If finer grain controls being used then this will lookup config for workspace.
  workspaceId?: string
  // user If sending to an existing user the object can be provided, this is used in the context.
  user?: User
  // from If sending from an address that is not what is configured in the SMTP config.
  from?: string
  // contents If sending a custom email then can supply contents which will be added to it.
  contents?: string
  // subject A custom subject can be specified if the config one is not desired.
  subject: string
  // info Pass in a structure of information to be stored alongside the invitation.
  info?: any
  cc?: string
  bcc?: string
  automation?: boolean
  invite?: EmailInvite
  attachments?: EmailAttachment[]
}

export interface Config<T = any> extends Document {
  type: ConfigType
  config: T
}

export interface SMTPInnerConfig {
  port: number
  host: string
  from: string
  subject?: string
  secure: boolean
  auth?: {
    user: string
    pass: string
  }
  connectionTimeout?: any
  fallback?: boolean
}

export interface SMTPConfig extends Config<SMTPInnerConfig> {}

export enum LockReason {
  FREE_TIER = "free_tier", // Locked because grace period in free tier has ended
}

export interface SettingsInnerConfig {
  platformUrl?: string
  company?: string
  logoUrl?: string // Populated on read
  docsUrl?: string
  logoUrlEtag?: string
  uniqueTenantId?: string
  analyticsEnabled?: boolean
  isSSOEnforced?: boolean
  createdVersion?: string
  lockedBy?: LockReason
  active?: boolean
}

export interface SettingsConfig extends Config<SettingsInnerConfig> {}

export type SSOConfigType = ConfigType.GOOGLE | ConfigType.OIDC
export type SSOConfig = GoogleInnerConfig | OIDCInnerConfig

export interface GoogleInnerConfig {
  clientID: string
  clientSecret: string
  activated: boolean
  /**
   * @deprecated read only
   */
  callbackURL?: string
}

export interface GoogleConfig extends Config<GoogleInnerConfig> {}

export interface OIDCStrategyConfiguration {
  issuer: string
  authorizationURL: string
  tokenURL: string
  userInfoURL: string
  clientID: string
  clientSecret: string
  callbackURL: string
}

export interface OIDCConfigs {
  configs: OIDCInnerConfig[]
}

export interface OIDCLogosInnerConfig {
  [key: string]: string
}

export interface OIDCLogosConfig extends Config<OIDCLogosInnerConfig> {}

export interface OIDCInnerConfig {
  configUrl: string
  clientID: string
  clientSecret: string
  logo: string
  name: string
  uuid: string
  activated: boolean
  scopes: string[]
}

export interface OIDCConfig extends Config<OIDCConfigs> {}

export interface OIDCWellKnownConfig {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
}

export interface SCIMInnerConfig {
  enabled: boolean
}

export interface SCIMConfig extends Config<SCIMInnerConfig> {}

export interface ProviderConfig {
  isDefault: boolean
  name: string
  active: boolean
  baseUrl?: string
  apiKey?: string
  defaultModel?: string
}

export const isConfig = (config: Object): config is Config =>
  "type" in config && "config" in config

export const isSettingsConfig = (config: Config): config is SettingsConfig =>
  config.type === ConfigType.SETTINGS

export const isSMTPConfig = (config: Config): config is SMTPConfig =>
  config.type === ConfigType.SMTP

export const isGoogleConfig = (config: Config): config is GoogleConfig =>
  config.type === ConfigType.GOOGLE

export const isOIDCConfig = (config: Config): config is OIDCConfig =>
  config.type === ConfigType.OIDC

export enum ConfigType {
  SETTINGS = "settings",
  ACCOUNT = "account",
  SMTP = "smtp",
  GOOGLE = "google",
  OIDC = "oidc",
  OIDC_LOGOS = "logos_oidc",
  SCIM = "scim",
  AI = "ai",
}

export type ConfigTypeToConfig<T extends ConfigType> =
  T extends ConfigType.SETTINGS
    ? SettingsConfig
    : T extends ConfigType.SMTP
      ? SMTPConfig
      : T extends ConfigType.GOOGLE
        ? GoogleConfig
        : T extends ConfigType.OIDC
          ? OIDCConfig
          : T extends ConfigType.OIDC_LOGOS
            ? OIDCLogosConfig
            : never
