import { configs, constants, context, db, withEnv } from "@supertoolmake/backend-core"
import { structures, TestConfiguration } from "../../../../tests"

describe("security boundaries", () => {
  const config = new TestConfiguration()
  beforeAll(() => config.beforeAll())
  afterAll(() => config.afterAll())

  it.each([
    undefined,
    "invalid-internal-key",
  ])("rejects tenant initialization with key %s before creating a database", async (key) => {
    await withEnv({ MULTI_TENANCY: "" }, async () => {
      config.selfHosted()
      const tenantId = structures.tenant.id()
      try {
        const request = config.request.post("/api/global/users/init")
        if (key) request.set(constants.Header.API_KEY, key)
        await request
          .send({ tenantId, email: structures.email(), password: "password123!" })
          .expect(403)
        expect(await context.doInTenant(tenantId, () => context.getGlobalDB().exists())).toBe(false)
      } finally {
        config.cloudHosted()
      }
    })
  })

  it("preserves public single-tenant bootstrap and rejects repeated initialization", async () => {
    const name = context.getGlobalDBName(structures.tenant.id())
    const database = db.getDB(name)
    const replacement = jest.replaceProperty(constants.StaticDatabases.GLOBAL, "name", name)
    try {
      await withEnv({ MULTI_TENANCY: "" }, async () => {
        config.selfHosted()
        const input = { tenantId: "default", email: structures.email(), password: "password123!" }
        await config.request.post("/api/global/users/init").send(input).expect(200)
        await config.request.post("/api/global/users/init").send(input).expect(403)
      })
    } finally {
      replacement.restore()
      config.cloudHosted()
      if (await database.exists()) await database.destroy()
    }
  })

  it("allows tenant initialization with the internal API key", async () => {
    const tenantId = structures.tenant.id()
    try {
      const response = await config.request
        .post("/api/global/users/init")
        .set(config.internalAPIHeaders())
        .send({ tenantId, email: structures.email(), password: "password123!" })
        .expect(200)
      const user = await context.doInTenant(tenantId, () =>
        context.getGlobalDB().get(response.body._id)
      )
      expect(user).toMatchObject({ tenantId, admin: { global: true } })
    } finally {
      await context.doInTenant(tenantId, () => context.getGlobalDB().destroy())
    }
  })

  it("keeps global invite lists admin-only", async () => {
    await config.request.get("/api/global/users/invites").set(config.defaultHeaders()).expect(200)
    const response = await config.api.users.saveUser(structures.users.builderUser(), 200)
    const { body: builder } = await config.api.users.getUser(response.body._id)
    await config.createSession(builder)
    await config.request
      .get("/api/global/users/invites")
      .set(config.authHeaders(builder))
      .expect(403)
  })

  it("omits legacy credentials and unknown fields from public settings while preserving branding", async () => {
    await config.doInTenant(async () => {
      const settings = await configs.getSettingsConfigDoc()
      await context.getGlobalDB().put({
        ...settings,
        config: {
          ...settings.config,
          company: "Example",
          platformTitle: "Example portal",
          liteLLM: { secretKey: "secret-proof" },
          unexpectedSecret: "secret-proof",
        },
      })
    })
    const response = await config.request
      .get("/api/global/configs/public")
      .set(config.tenantIdHeaders())
      .expect(200)
    expect(response.body.config).toMatchObject({
      company: "Example",
      platformTitle: "Example portal",
    })
    expect(response.body.config).not.toHaveProperty("liteLLM")
    expect(response.body.config).not.toHaveProperty("unexpectedSecret")
    expect(JSON.stringify(response.body)).not.toContain("secret-proof")
  })
})
