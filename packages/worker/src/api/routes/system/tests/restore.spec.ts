import { TestConfiguration } from "../../../../tests"

describe("/api/system/restore", () => {
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

  describe("POST /api/global/restore", () => {
    it("prepares the system after restore", async () => {
      const res = await config.api.restore.restored()
      expect(res.body).toEqual({
        message: "System prepared after restore.",
      })
    })
  })
})
