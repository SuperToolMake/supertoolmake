import { TestConfiguration } from "../../../../tests"

describe("/api/system/status", () => {
  const config = new TestConfiguration()

  beforeAll(async () => {
    await config.beforeAll()
  })

  afterAll(async () => {
    await config.afterAll()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("GET /api/system/status", () => {
    it("returns status in self host", async () => {
      config.selfHosted()
      const res = await config.api.status.getStatus()
      expect(res.body).toEqual({
        health: {
          passing: true,
        },
        version: expect.any(String),
      })
      config.cloudHosted()
    })
  })
})
