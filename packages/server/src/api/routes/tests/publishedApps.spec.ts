jest.mock("@supertoolmake/backend-core", () => {
  const actual = jest.requireActual("@supertoolmake/backend-core")
  return {
    ...actual,
    db: {
      ...actual.db,
      // Other suites create isolated fixture databases in the same CouchDB.
      // The real workspace creation guard should only see this suite's workspace.
      getAllDbs: jest.fn(async () =>
        (await actual.db.getAllDbs()).filter((name: string) =>
          ["app_dev_workspace", "app_workspace"].includes(name)
        )
      ),
    },
  }
})

import { cache, constants, db, utils } from "@supertoolmake/backend-core"
import type { Workspace, WorkspaceAppResponse } from "@supertoolmake/types"
import { basicScreen } from "../../../tests/utilities/structures"
import * as setup from "./utilities"

describe("published apps in the single workspace", () => {
  const config = setup.getConfig()
  const request = setup.getRequest()
  const workspacesToClean = new Set<string>()
  let fixtureWorkspace: Workspace

  beforeAll(async () => {
    fixtureWorkspace = await config.init()
  })

  afterEach(async () => {
    for (const id of workspacesToClean) {
      await cache.workspace.invalidateWorkspaceMetadata(id)
      if (await db.getDB(id).exists()) {
        await db.getDB(id).destroy()
      }
    }
    workspacesToClean.clear()
    config.devWorkspace = fixtureWorkspace
    config.devWorkspaceId = fixtureWorkspace.appId
    config.prodWorkspaceId = db.getProdWorkspaceID(fixtureWorkspace.appId)
  })

  afterAll(setup.afterAll)

  async function expectLiveApp(app: WorkspaceAppResponse, screenId: string) {
    // Browser navigation has no workspace header. Resolve it from the live URL.
    const headers = config.defaultHeaders()
    delete headers[constants.Header.WORKSPACE_ID]
    const livePath = `/app${app.url}`
    const response = await request.get(livePath).set(headers).expect(200)
    expect(response.body.appId).toBe("app_workspace")

    const appPackage = await config.api.workspace.getAppPackage("app_workspace", {
      headers: {
        [constants.Header.WORKSPACE_ID]: "app_workspace",
        [constants.Header.TYPE]: "client",
        referer: `http://localhost:10000${livePath}`,
      },
    })
    expect(appPackage.application.appId).toBe("app_workspace")
    expect(appPackage.screens).toEqual([
      expect.objectContaining({ _id: screenId, workspaceAppId: app._id }),
    ])
  }

  it.each([
    "onboarding",
    "standard",
  ])("publishes and serves the first and additional apps after %s creation", async (creation) => {
    const workspace = await config.api.workspace.create(
      creation === "onboarding" ? { isOnboarding: "true" } : { name: `Workspace ${utils.newid()}` }
    )
    config.devWorkspace = workspace
    config.devWorkspaceId = workspace.appId
    config.prodWorkspaceId = db.getProdWorkspaceID(workspace.appId)
    workspacesToClean.add(workspace.appId)
    workspacesToClean.add(config.getProdWorkspaceId())

    expect(workspace.appId).toBe("app_dev_workspace")
    expect(workspace.instance._id).toBe("app_dev_workspace")

    let firstApp: WorkspaceAppResponse
    let firstScreenId: string
    if (creation === "onboarding") {
      const { workspaceApps } = await config.api.workspaceApp.fetch()
      const welcome = workspaceApps.find((app) => app.isDefault)!
      firstApp = (
        await config.api.workspaceApp.update({
          _id: welcome._id,
          _rev: welcome._rev,
          name: welcome.name,
          url: welcome.url,
          navigation: welcome.navigation,
          disabled: false,
        })
      ).workspaceApp
      const [welcomeScreen] = await config.api.screen.list()
      firstScreenId = welcomeScreen._id!
    } else {
      firstApp = (
        await config.api.workspaceApp.create({
          name: "First app",
          url: "/first-app",
          disabled: false,
        })
      ).workspaceApp
      firstScreenId = (
        await config.api.screen.save({ ...basicScreen(), workspaceAppId: firstApp._id })
      )._id!
    }

    await config.api.workspace.publish()
    expect(await db.getDB("app_workspace").exists()).toBe(true)
    await expectLiveApp(firstApp, firstScreenId)

    const { workspaceApp: additionalApp } = await config.api.workspaceApp.create({
      name: "Additional app",
      url: "/additional-app",
      disabled: false,
    })
    const screen = await config.api.screen.save({
      ...basicScreen(),
      workspaceAppId: additionalApp._id,
    })
    await config.api.workspace.publish()

    await expectLiveApp(additionalApp, screen._id!)
    await expectLiveApp(firstApp, firstScreenId)
    await config.api.workspace.create(
      { isOnboarding: "true" },
      { status: 409, body: { message: "Only one workspace is supported" } }
    )
  })
})
