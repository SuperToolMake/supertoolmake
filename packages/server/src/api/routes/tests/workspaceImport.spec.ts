import path from "node:path"
import { getAppObjectStorageEtags } from "../../../tests/utilities/objectStore"
import * as setup from "./utilities"

describe("/applications/:appId/import", () => {
  const request = setup.getRequest()
  const config = setup.getConfig()

  afterAll(setup.afterAll)

  beforeAll(async () => {
    await config.init()
  })

  it("imports an export over the existing workspace", async () => {
    const appId = config.getDevWorkspaceId()
    await request
      .post(`/api/applications/${appId}/import`)
      .attach("appExport", path.join(__dirname, "data", "export-change-request.tar.gz"))
      .set(config.defaultHeaders())
      .expect("Content-Type", /json/)
      .expect(200)
    const appPackage = await config.api.workspace.get(appId!)
    expect(appPackage.navigation?.links?.length).toBe(3)
    expect(appPackage.navigation?.links?.[0].url).toBe("/my-change-requests")
    expect(appPackage.navigation?.links?.[1].url).toBe("/review-change-requests")
    expect(appPackage.navigation?.links?.[2].url).toBe("/administration")

    const screens = await config.api.screen.list()
    expect(screens.length).toBe(6)
    expect(screens[0].routing.route).toBe("/my-change-requests")
    expect(screens[1].routing.route).toBe("/administration")
    expect(screens[2].routing.route).toBe("/review-change-requests")
    expect(screens[3].routing.route).toBe("/my-change-requests/edit/:id")
    expect(screens[4].routing.route).toBe("/administration/:id")
    expect(screens[5].routing.route).toBe("/change-request/new")

    const { workspaceApps: apps } = await config.api.workspaceApp.fetch()
    expect(apps.length).toBe(1)
    expect(apps[0].name).toBe("Change request management")

    const fileEtags = await getAppObjectStorageEtags(appId!)
    expect(fileEtags).toMatchObject({
      "budibase-client.js": "e5cc573e15b6f763059fb39c7023563b",
      "manifest.json": "93bcfcf77d7c3fa555642816f42214fa",
    })
  })
})
