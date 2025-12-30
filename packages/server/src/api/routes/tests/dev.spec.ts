import * as setup from "./utilities"

describe("/dev", () => {
  let request = setup.getRequest()
  let config = setup.getConfig()

  afterAll(setup.afterAll)

  beforeAll(async () => {
    await config.init()
    jest.clearAllMocks()
  })

  describe("revert", () => {
    it("should revert the application", async () => {
      await request
        .post(`/api/dev/${config.getDevWorkspaceId()}/revert`)
        .set(config.defaultHeaders())
        .expect("Content-Type", /json/)
        .expect(200)
    })
  })

  describe("version", () => {
    it("should get the installation version", async () => {
      const res = await request
        .get(`/api/dev/version`)
        .set(config.defaultHeaders())
        .expect("Content-Type", /json/)
        .expect(200)

      expect(res.body.version).toBe("0.0.0+jest")
    })
  })
})
