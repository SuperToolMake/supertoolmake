import crypto from "crypto"
import { contentSecurityPolicy } from "../contentSecurityPolicy"

jest.mock("crypto", () => ({
  randomBytes: jest.fn(),
  randomUUID: jest.fn(),
}))
jest.mock("../../cache", () => ({
  workspace: {
    getWorkspaceMetadata: jest.fn(),
  },
}))

describe("contentSecurityPolicy middleware", () => {
  let ctx: any
  let next: any
  const mockNonce = "mocked/nonce"

  beforeEach(() => {
    ctx = {
      state: {},
      set: jest.fn(),
    }
    next = jest.fn()
    // @ts-ignore
    crypto.randomBytes.mockReturnValue(Buffer.from(mockNonce, "base64"))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should generate a nonce and set it in the script-src directive", async () => {
    await contentSecurityPolicy(ctx, next)

    expect(ctx.state.nonce).toBe(mockNonce)
    expect(ctx.set).toHaveBeenCalledWith(
      "Content-Security-Policy",
      expect.stringContaining(
        `script-src 'self' 'unsafe-eval' https://*.budibase.net https://cdn.budi.live https://js.intercomcdn.com https://widget.intercom.io https://d2l5prqdbvm3op.cloudfront.net https://www.google.com/recaptcha/api.js 'nonce-mocked/nonce'`
      )
    )
    expect(next).toHaveBeenCalled()
  })

  it("should include all CSP directives in the header", async () => {
    await contentSecurityPolicy(ctx, next)

    const cspHeader = ctx.set.mock.calls[0][1]
    expect(cspHeader).toContain("default-src 'self'")
    expect(cspHeader).toContain("script-src 'self' 'unsafe-eval'")
    expect(cspHeader).toContain("style-src 'self' 'unsafe-inline'")
    expect(cspHeader).toContain("object-src 'none'")
    expect(cspHeader).toContain("base-uri 'self'")
    expect(cspHeader).toContain("connect-src 'self'")
    expect(cspHeader).toContain("font-src 'self'")
    expect(cspHeader).toContain("frame-src 'self'")
    expect(cspHeader).toContain("img-src http: https: data: blob:")
    expect(cspHeader).toContain("manifest-src 'self'")
    expect(cspHeader).toContain("media-src 'self'")
    expect(cspHeader).toContain("worker-src blob:")
  })
})
