import { configs, constants, context, db } from "@supertoolmake/backend-core"
import { structures, TestConfiguration } from "../../../../tests"

describe("security boundaries", () => {
  const config = new TestConfiguration()
  beforeAll(() => config.beforeAll())
  afterAll(() => config.afterAll())

  it.each([
    undefined,
    "invalid-internal-key",
  ])("rejects tenant initialization with key %s before creating a database", async (key) => {
    const tenantId = structures.tenant.id()
    const request = config.request.post("/api/global/users/init")
    if (key) request.set(constants.Header.API_KEY, key)
    await request
      .send({ tenantId, email: structures.email(), password: "password123!" })
      .expect(403)
    expect(await context.doInTenant(tenantId, () => context.getGlobalDB().exists())).toBe(false)
  })

  it("preserves public single-tenant bootstrap and rejects repeated initialization", async () => {
    const name = context.getGlobalDBName(structures.tenant.id())
    const database = db.getDB(name)
    const replacement = jest.replaceProperty(constants.StaticDatabases.GLOBAL, "name", name)
    try {
      const input = { tenantId: "default", email: structures.email(), password: "password123!" }
      await config.request.post("/api/global/users/init").send(input).expect(200)
      await config.request.post("/api/global/users/init").send(input).expect(403)
    } finally {
      replacement.restore()
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
      expect(user).toMatchObject({ tenantId: context.DEFAULT_TENANT_ID, admin: { global: true } })
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
    const original = await context.doInTenant(context.DEFAULT_TENANT_ID, async () => {
      const db = context.getGlobalDB()
      const settings = await configs.getSettingsConfigDoc()
      const raw = await db.get(settings._id).catch(() => undefined)
      await db.put({
        ...settings,
        config: {
          ...settings.config,
          company: "Example",
          platformTitle: "Example portal",
          liteLLM: { secretKey: "secret-proof" },
          unexpectedSecret: "secret-proof",
        },
      })
      return { id: settings._id, raw }
    })
    try {
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
    } finally {
      await context.doInTenant(context.DEFAULT_TENANT_ID, async () => {
        const db = context.getGlobalDB()
        if (original.raw) {
          const current = await db.get(original.id!)
          await db.put({ ...original.raw, _rev: current._rev })
        } else {
          await db.remove(original.id!, (await db.get(original.id!))._rev)
        }
      })
    }
  })
})
