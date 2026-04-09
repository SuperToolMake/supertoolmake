import { constants } from "@supertoolmake/backend-core"
import { setEnv } from "../../../environment"
import { afterAll as _afterAll, getConfig, getRequest } from "./utilities"

describe("/static", () => {
  const request = getRequest()
  const config = getConfig()
  let cleanupEnv: () => void

  afterAll(() => {
    _afterAll()
    cleanupEnv()
  })

  beforeAll(async () => {
    cleanupEnv = setEnv({ SELF_HOSTED: "true" })
    await config.init()
  })

  describe("/app", () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it("should serve the app by url", async () => {
      const headers = config.defaultHeaders()
      delete headers[constants.Header.APP_ID]

      const res = await request.get(`/app${config.getProdWorkspace().url}`).set(headers).expect(200)

      expect(res.body.appId).toBe(config.prodWorkspaceId)
    })

    it("should serve the app preview by id", async () => {
      const res = await request
        .get(`/${config.devWorkspaceId}`)
        .set(config.defaultHeaders())
        .expect(200)

      expect(res.body.appId).toBe(config.devWorkspaceId)
    })
  })

  describe("/", () => {
    it("should move permanently from base call (public call)", async () => {
      const res = await request.get(`/`)
      expect(res.status).toEqual(301)
      expect(res.text).toEqual(`Redirecting to /builder.`)
    })

    it("should not error when trying to get 'apple-touch-icon.png' (public call)", async () => {
      const res = await request.get(`/apple-touch-icon.png`)
      expect(res.status).toEqual(302)
      expect(res.text).toEqual(`Redirecting to /builder/logo_supertoolmake.png.`)
    })
  })
})
