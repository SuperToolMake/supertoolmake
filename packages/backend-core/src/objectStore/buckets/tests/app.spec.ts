import { testEnv } from "../../../../tests/extra"
import * as app from "../app"

describe("app", () => {
  beforeEach(() => {
    testEnv.nodeJest()
  })

  function baseCheck(url: string) {
    expect(url).toBe("/api/assets/app_123/client?version=2.0.0")
  }

  describe("clientLibraryUrl", () => {
    async function getClientUrl() {
      return await app.clientLibraryUrl("app_123", "2.0.0")
    }

    it("gets url in dev", async () => {
      testEnv.nodeDev()
      const url = await getClientUrl()
      baseCheck(url)
    })

    it("gets url with custom S3", async () => {
      testEnv.withS3()
      const url = await getClientUrl()
      baseCheck(url)
    })

    it("gets url with cloudfront + s3", async () => {
      testEnv.withCloudfront()
      const url = await getClientUrl()
      baseCheck(url)
    })
  })

  describe("getAppFileUrl", () => {
    function getAppFileUrl() {
      return app.getAppFileUrl("app_123/attachments/image.jpeg")
    }

    it("gets url with embedded minio", async () => {
      testEnv.withMinio()
      const url = await getAppFileUrl()
      expect(url).toBe("/files/signed/prod-budi-app-assets/app_123/attachments/image.jpeg")
    })

    it("gets url with custom S3", async () => {
      testEnv.withS3()
      const url = await getAppFileUrl()
      expect(url).toBe("http://s3.example.com/prod-budi-app-assets/app_123/attachments/image.jpeg")
    })

    it("gets url with cloudfront + s3", async () => {
      testEnv.withCloudfront()
      const url = await getAppFileUrl()
      // omit rest of signed params
      expect(url.includes("http://cf.example.com/app_123/attachments/image.jpeg?")).toBe(true)
    })
  })
})
