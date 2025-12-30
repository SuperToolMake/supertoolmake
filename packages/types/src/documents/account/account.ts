import { Hosting } from "../../sdk"

export interface CreateAccount {
  email: string
  tenantId: string
  hosting: Hosting
  authType: AuthType
  accountName: string
  // optional fields - for sso based sign ups
  registrationStep?: string
  name?: string
  size?: string
  profession?: string
}

export interface CreatePassswordAccount extends CreateAccount {
  password: string
}

export const isCreatePasswordAccount = (
  account: CreateAccount
): account is CreatePassswordAccount => account.authType === AuthType.PASSWORD

export interface Account extends CreateAccount {
  // generated
  accountId: string
  createdAt: number
  // registration
  verified: boolean
  verificationSent: boolean
  installId?: string
  installTenantId?: string
  installVersion?: string
  stripeCustomerId?: string
  provider?: AccountSSOProvider
  providerType?: AccountSSOProviderType
  tenantName?: string
}

export interface PasswordAccount extends Account {
  password: string
}

export const isPasswordAccount = (
  account: Account
): account is PasswordAccount =>
  account.authType === AuthType.PASSWORD && account.hosting === Hosting.SELF

export interface CloudAccount extends Account {
  password?: string
  budibaseUserId: string
}

export const isCloudAccount = (account: Account): account is CloudAccount =>
  account.hosting === Hosting.CLOUD

export const isSelfHostAccount = (account: Account) =>
  account.hosting === Hosting.SELF

export const isSSOAccount = (account: Account): account is SSOAccount =>
  account.authType === AuthType.SSO

export enum AccountSSOProviderType {
  GOOGLE = "google",
  MICROSOFT = "microsoft",
}

export enum AccountSSOProvider {
  GOOGLE = "google",
  MICROSOFT = "microsoft",
}

const verifiableSSOProviders: AccountSSOProvider[] = [
  AccountSSOProvider.MICROSOFT,
]
export function isVerifiableSSOProvider(provider: AccountSSOProvider): boolean {
  return verifiableSSOProviders.includes(provider)
}

export interface AccountSSO {
  ssoId?: string
  provider: AccountSSOProvider
  providerType: AccountSSOProviderType
  oauth2?: OAuthTokens
}

export type SSOAccount = (Account | CloudAccount) & AccountSSO

export enum AuthType {
  SSO = "sso",
  PASSWORD = "password",
}

export interface OAuthTokens {
  accessToken: string
  refreshToken: string
}
