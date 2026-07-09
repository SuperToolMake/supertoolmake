import {
  ConfigType,
  type JwtClaims,
  type OIDCInnerConfig,
  type OIDCStrategyConfiguration,
  type SaveSSOUserFunction,
  type SSOAuthDetails,
  type SSOProfile,
  SSOProviderType,
} from "@supertoolmake/types"
import fetch from "node-fetch"
import { validEmail } from "../../../utils"
import { ssoCallbackUrl } from "../utils"
import * as sso from "./sso"

const OIDCStrategy = require("@techpass/passport-openidconnect").Strategy

type OIDCUserInfoProfile = {
  id?: string
  displayName?: string
  name?: { givenName?: string; familyName?: string }
  _json?: {
    email?: string
    email_verified?: boolean
  }
  provider?: string
}

// the id_token profile also exposes the raw claims via _json
type OIDCIdProfile = {
  id?: string
  displayName?: string
  name?: { givenName?: string; familyName?: string }
  emails?: { value: string }[]
  username?: string
  _json?: {
    email?: string
    email_verified?: boolean
  }
}

type VerifyFunction = (
  issuer: string,
  sub: string,
  profile: SSOProfile,
  jwtClaims: JwtClaims,
  accessToken: string,
  refreshToken: string,
  idToken: string,
  params: any,
  done: Function
) => Promise<void>

export function buildVerifyFn(
  saveUserFn: SaveSSOUserFunction,
  allowUnverifiedEmailLinking = false
): VerifyFunction {
  /**
   * @param issuer The identity provider base URL
   * @param sub The user ID
   * @param profile The user profile information. Created by passport from the /userinfo response
   * @param jwtClaims The parsed id_token claims
   * @param accessToken The access_token for contacting the identity provider - may or may not be a JWT
   * @param refreshToken The refresh_token for obtaining a new access_token - usually not a JWT
   * @param idToken The id_token - always a JWT
   * @param params The response body from requesting an access_token
   * @param done The passport callback: err, user, info
   */
  return async (
    issuer: string,
    _sub: string,
    profile: SSOProfile,
    jwtClaims: JwtClaims,
    accessToken: string,
    refreshToken: string,
    _idToken: string,
    _params: any,
    done: Function
  ) => {
    const details: SSOAuthDetails = {
      // store the issuer info to enable sync in future
      provider: issuer,
      providerType: SSOProviderType.OIDC,
      userId: profile.id,
      profile: profile,
      email: getEmail(profile, jwtClaims),
      emailVerified: getEmailVerified(profile, jwtClaims),
      oauth2: {
        accessToken: accessToken,
        refreshToken: refreshToken,
      },
    }

    return sso.authenticate(
      details,
      false, // don't require local accounts to exist
      done,
      saveUserFn,
      allowUnverifiedEmailLinking
    )
  }
}

export function normalizeProfile(
  uiProfile: OIDCUserInfoProfile | undefined,
  idProfile: OIDCIdProfile
): SSOProfile {
  const profileJson = { ...(uiProfile?._json || {}) }

  if (!profileJson.email && idProfile.emails?.length) {
    profileJson.email = idProfile.emails[0].value
    // keep email_verified aligned with the email it describes
    profileJson.email_verified = idProfile._json?.email_verified
  }

  const displayName = uiProfile?.displayName || idProfile.displayName

  return {
    id: uiProfile?.id || idProfile.id || "",
    name:
      uiProfile?.name ||
      idProfile.name ||
      (!!displayName && { givenName: displayName, familyName: "" }) ||
      undefined,
    _json: profileJson,
    provider: uiProfile?.provider,
  }
}

export function buildJwtClaims(
  uiProfile: OIDCUserInfoProfile | undefined,
  idProfile: OIDCIdProfile
): JwtClaims {
  return {
    email: uiProfile?._json?.email || idProfile.emails?.[0]?.value,
    email_verified: idProfile._json?.email_verified,
    preferred_username: idProfile.username,
  }
}

/**
 * @param profile The structured profile created by passport using the user info endpoint
 * @param jwtClaims The claims returned in the id token
 */
function getEmail(profile: SSOProfile, jwtClaims: JwtClaims) {
  // profile not guaranteed to contain email e.g. github connected azure ad account
  if (profile._json.email) {
    return profile._json.email.toLowerCase()
  }

  // fallback to id token email
  if (jwtClaims.email) {
    return jwtClaims.email.toLowerCase()
  }

  // fallback to id token preferred username
  const username = jwtClaims.preferred_username
  if (username && validEmail(username)) {
    return username.toLowerCase()
  }

  throw new Error(
    `Could not determine user email from profile ${JSON.stringify(
      profile
    )} and claims ${JSON.stringify(jwtClaims)}`
  )
}

/**
 * Determines whether the identity provider has verified the email that
 * getEmail resolved. Mirrors getEmail's source precedence so the returned flag
 * describes the same claim. An absent email_verified is treated as unverified
 * (OIDC Core §5.7). A preferred_username used as an email is never considered
 * verified.
 * @param profile The structured profile created by passport using the user info endpoint
 * @param jwtClaims The claims returned in the id token
 */
function getEmailVerified(profile: SSOProfile, jwtClaims: JwtClaims): boolean {
  if (profile._json.email) {
    return profile._json.email_verified === true
  }

  if (jwtClaims.email) {
    return jwtClaims.email_verified === true
  }

  return false
}

/**
 * Create an instance of the oidc passport strategy. This wrapper fetches the configuration
 * from couchDB rather than environment variables, using this factory is necessary for dynamically configuring passport.
 * @returns Dynamically configured Passport OIDC Strategy
 */
export async function strategyFactory(
  config: OIDCStrategyConfiguration,
  saveUserFn: SaveSSOUserFunction
) {
  try {
    const verify = buildVerifyFn(saveUserFn, config.allowUnverifiedEmailLinking)
    const strategy = new OIDCStrategy(config, verify)
    strategy.name = "oidc"
    return strategy
  } catch (err: any) {
    throw new Error(`Error constructing OIDC authentication strategy - ${err}`)
  }
}

export async function fetchStrategyConfig(
  oidcConfig: OIDCInnerConfig,
  callbackUrl?: string
): Promise<OIDCStrategyConfiguration> {
  try {
    const { clientID, clientSecret, configUrl, pkce, allowUnverifiedEmailLinking } = oidcConfig

    if (!(clientID && clientSecret && callbackUrl && configUrl)) {
      // check for remote config and all required elements
      throw new Error(
        "Configuration invalid. Must contain clientID, clientSecret, callbackUrl and configUrl"
      )
    }

    const response = await fetch(configUrl)

    if (!response.ok) {
      throw new Error(
        `Unexpected response when fetching openid-configuration: ${response.statusText}`
      )
    }

    const body = await response.json()

    return {
      issuer: body.issuer,
      authorizationURL: body.authorization_endpoint,
      tokenURL: body.token_endpoint,
      userInfoURL: body.userinfo_endpoint,
      clientID: clientID,
      clientSecret: clientSecret,
      callbackURL: callbackUrl,
      pkce: pkce,
      allowUnverifiedEmailLinking: allowUnverifiedEmailLinking,
    }
  } catch (err) {
    throw new Error(`Error constructing OIDC authentication configuration - ${err}`)
  }
}

export async function getCallbackUrl() {
  return ssoCallbackUrl(ConfigType.OIDC)
}
