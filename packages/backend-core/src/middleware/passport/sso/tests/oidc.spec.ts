import {
  type JwtClaims,
  type OIDCInnerConfig,
  type SSOAuthDetails,
  SSOProviderType,
} from "@supertoolmake/types"
import nock from "nock"
import { generator, structures } from "../../../../../tests"
import * as oidc from "../oidc"
import * as _sso from "../sso"

jest.mock("@techpass/passport-openidconnect")
const mockStrategy = require("@techpass/passport-openidconnect").Strategy

jest.mock("../sso")
const sso = jest.mocked(_sso)

const mockSaveUser = jest.fn()
const mockDone = jest.fn()

describe("oidc", () => {
  const callbackUrl = generator.url()
  const oidcConfig: OIDCInnerConfig = structures.sso.oidcConfig()
  const wellKnownConfig = structures.sso.oidcWellKnownConfig()

  beforeEach(() => {
    nock.cleanAll()
    nock(oidcConfig.configUrl).get("/").reply(200, wellKnownConfig)
  })

  describe("strategyFactory", () => {
    it("should create successfully create an oidc strategy", async () => {
      const strategyConfiguration = await oidc.fetchStrategyConfig(oidcConfig, callbackUrl)
      await oidc.strategyFactory(strategyConfiguration, mockSaveUser)

      const expectedOptions = {
        issuer: wellKnownConfig.issuer,
        authorizationURL: wellKnownConfig.authorization_endpoint,
        tokenURL: wellKnownConfig.token_endpoint,
        userInfoURL: wellKnownConfig.userinfo_endpoint,
        clientID: oidcConfig.clientID,
        clientSecret: oidcConfig.clientSecret,
        callbackURL: callbackUrl,
      }
      expect(mockStrategy).toHaveBeenCalledWith(expectedOptions, expect.anything())
    })
  })

  describe("authenticate", () => {
    const details: SSOAuthDetails = structures.sso.authDetails()
    details.providerType = SSOProviderType.OIDC
    const profile = details.profile!
    const issuer = profile.provider

    const sub = generator.string()
    const idToken = generator.string()
    const params = {}

    let authenticateFn: any
    let uiProfile: {
      id?: string
      name?: { givenName?: string; familyName?: string }
      _json?: {
        email?: string
        email_verified?: boolean
        picture?: string
      }
      provider?: string
    }
    let idProfile: {
      id?: string
      name?: { givenName?: string; familyName?: string }
      emails?: { value: string }[]
      username?: string
      _json?: {
        email?: string
        email_verified?: boolean
      }
    }

    beforeEach(async () => {
      jest.clearAllMocks()
      authenticateFn = oidc.buildVerifyFn(mockSaveUser)
      uiProfile = {
        id: profile.id,
        name: profile.name,
        _json: { ...profile._json },
        provider: profile.provider,
      }
      idProfile = {
        id: profile.id,
        name: profile.name,
        emails: [{ value: details.email! }],
        username: details.email,
        _json: { email: details.email, email_verified: true },
      }
    })

    async function authenticate() {
      // Normalize profiles to simulate what the passport strategy does
      const profileJson: Record<string, any> = { ...(uiProfile?._json || {}) }
      if (!profileJson.email && idProfile.emails?.length) {
        profileJson.email = idProfile.emails[0].value
        profileJson.email_verified = idProfile._json?.email_verified
      }

      const normalizedProfile = {
        id: uiProfile?.id || profile.id,
        name: uiProfile?.name || profile.name,
        _json: profileJson,
        provider: uiProfile?.provider,
      }

      const normalizedClaims: JwtClaims = {
        email: uiProfile?._json?.email || idProfile.emails?.[0]?.value,
        email_verified: idProfile._json?.email_verified,
        preferred_username: idProfile.username,
      }

      await authenticateFn(
        issuer,
        sub,
        normalizedProfile,
        normalizedClaims,
        details.oauth2.accessToken,
        details.oauth2.refreshToken,
        idToken,
        params,
        mockDone
      )
    }

    it("passes auth details to sso module", async () => {
      await authenticate()

      expect(sso.authenticate).toHaveBeenCalledWith(details, false, mockDone, mockSaveUser, false)
    })

    it("uses JWT email to get email", async () => {
      delete uiProfile._json?.email

      await authenticate()

      expect(sso.authenticate).toHaveBeenCalledWith(
        expect.objectContaining({ email: details.email }),
        false,
        mockDone,
        mockSaveUser,
        false
      )
    })

    it("marks email as unverified when the userinfo email_verified claim is false", async () => {
      uiProfile._json!.email_verified = false

      await authenticate()

      expect(sso.authenticate).toHaveBeenCalledWith(
        expect.objectContaining({ emailVerified: false }),
        false,
        mockDone,
        mockSaveUser,
        false
      )
    })

    it("marks email as unverified when no email_verified claim is present", async () => {
      delete uiProfile._json?.email_verified
      delete idProfile._json

      await authenticate()

      expect(sso.authenticate).toHaveBeenCalledWith(
        expect.objectContaining({ emailVerified: false }),
        false,
        mockDone,
        mockSaveUser,
        false
      )
    })

    it("uses id token email_verified when userinfo has no email", async () => {
      delete uiProfile._json?.email
      idProfile._json = { email: details.email, email_verified: false }

      await authenticate()

      expect(sso.authenticate).toHaveBeenCalledWith(
        expect.objectContaining({ emailVerified: false }),
        false,
        mockDone,
        mockSaveUser,
        false
      )
    })

    it("passes the allowUnverifiedEmailLinking flag through to sso", async () => {
      authenticateFn = oidc.buildVerifyFn(mockSaveUser, true)

      await authenticate()

      expect(sso.authenticate).toHaveBeenCalledWith(details, false, mockDone, mockSaveUser, true)
    })

    it("uses id token username to get email", async () => {
      delete uiProfile._json?.email
      delete idProfile.emails

      await authenticate()

      const expectedDetails = {
        ...details,
        // a preferred_username used as the email is never considered verified
        emailVerified: false,
        profile: {
          ...details.profile,
          _json: {
            ...details.profile?._json,
            email: undefined,
          },
        },
      }

      expect(sso.authenticate).toHaveBeenCalledWith(
        expectedDetails,
        false,
        mockDone,
        mockSaveUser,
        false
      )
    })

    it("uses invalid id token username to get email", async () => {
      delete uiProfile._json?.email
      delete idProfile.emails

      idProfile.username = "invalidUsername"

      await expect(authenticate()).rejects.toThrow("Could not determine user email from profile")
    })

    it("normalizes uppercase emails before authenticating", async () => {
      const upperEmail = "MIKE.SEALEY@EXAMPLE.COM"
      uiProfile._json = { email: upperEmail }
      idProfile.emails = [{ value: upperEmail }]
      idProfile.username = upperEmail

      await authenticate()

      expect(sso.authenticate).toHaveBeenCalledWith(
        expect.objectContaining({ email: upperEmail.toLowerCase() }),
        false,
        mockDone,
        mockSaveUser,
        false
      )
    })

    it("populates first and last name from profile data", async () => {
      const givenName = "Ada"
      const familyName = "Lovelace"
      uiProfile.name = {
        givenName,
        familyName,
      }
      idProfile.name = {
        givenName,
        familyName,
      }

      await authenticate()

      const expectedDetails = {
        ...details,
        profile: {
          ...details.profile,
          name: {
            givenName,
            familyName,
          },
        },
      }

      expect(sso.authenticate).toHaveBeenCalledWith(
        expectedDetails,
        false,
        mockDone,
        mockSaveUser,
        false
      )
    })

    it("uses id token email when userinfo has no email", async () => {
      delete uiProfile._json?.email

      await authenticate()

      expect(sso.authenticate).toHaveBeenCalledWith(
        expect.objectContaining({ email: details.email }),
        false,
        mockDone,
        mockSaveUser,
        false
      )
    })

    it("throws when no email source is available", async () => {
      delete uiProfile._json?.email
      delete idProfile.emails
      idProfile.username = "invalidUsername"

      await expect(authenticate()).rejects.toThrow("Could not determine user email from profile")
    })
  })
})
