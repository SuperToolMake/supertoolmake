import crypto from "node:crypto"
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

const getCSPAdditionalDirectives = () => process.env.CSP_ADDITIONAL_DIRECTIVES
jest.mock("../../environment", () => ({
  __esModule: true,
  default: {
    get CSP_ADDITIONAL_DIRECTIVES() {
      return getCSPAdditionalDirectives()
    },
  },
}))

describe("contentSecurityPolicy middleware", () => {
  let ctx: any
  let next: any
  const mockNonce = "mocked/nonce"
  let originalEnv: string | undefined

  beforeEach(() => {
    originalEnv = process.env.CSP_ADDITIONAL_DIRECTIVES
    ctx = {
      state: {},
      set: jest.fn(),
    }
    next = jest.fn()
    // @ts-expect-error
    crypto.randomBytes.mockReturnValue(Buffer.from(mockNonce, "base64"))
  })

  afterEach(() => {
    jest.clearAllMocks()
    process.env.CSP_ADDITIONAL_DIRECTIVES = originalEnv
  })

  it("should generate a nonce and set it in the script-src directive", async () => {
    await contentSecurityPolicy(ctx, next)

    expect(ctx.state.nonce).toBe(mockNonce)
    expect(ctx.set).toHaveBeenCalledWith(
      "Content-Security-Policy",
      expect.stringContaining(`script-src 'self' 'unsafe-eval'`)
    )
    expect(ctx.set).toHaveBeenCalledWith(
      "Content-Security-Policy",
      expect.stringContaining(`'nonce-mocked/nonce'`)
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

  it("should include additional connect-src directives from environment variable", async () => {
    process.env.CSP_ADDITIONAL_DIRECTIVES = "https://example.com, https://api.example.org"
    await contentSecurityPolicy(ctx, next)

    const cspHeader = ctx.set.mock.calls[0][1]
    expect(cspHeader).toContain("https://example.com")
    expect(cspHeader).toContain("https://api.example.org")
  })

  it("should handle single additional connect-src directive", async () => {
    process.env.CSP_ADDITIONAL_DIRECTIVES = "https://single.example.com"
    await contentSecurityPolicy(ctx, next)

    const cspHeader = ctx.set.mock.calls[0][1]
    expect(cspHeader).toContain("https://single.example.com")
  })

  it("should handle additional connect-src with spaces", async () => {
    process.env.CSP_ADDITIONAL_DIRECTIVES = "https://foo.com , https://bar.com "
    await contentSecurityPolicy(ctx, next)

    const cspHeader = ctx.set.mock.calls[0][1]
    expect(cspHeader).toContain("https://foo.com")
    expect(cspHeader).toContain("https://bar.com")
  })

  it("should not modify connect-src when no additional directives provided", async () => {
    process.env.CSP_ADDITIONAL_DIRECTIVES = undefined
    await contentSecurityPolicy(ctx, next)

    const cspHeader = ctx.set.mock.calls[0][1]
    const connectSrcMatch = cspHeader.match(/connect-src ([^;]+)/)
    expect(connectSrcMatch).toBeTruthy()
    expect(connectSrcMatch![1]).toContain("'self'")
    expect(connectSrcMatch![1]).toContain("https://*.amazonaws.com")
    expect(connectSrcMatch![1]).toContain("https://api.github.com")
  })
})
