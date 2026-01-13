import { db as dbCore } from "@budibase/backend-core"
import { structures } from "@budibase/backend-core/tests"
import { PublishResourceState, WorkspaceApp } from "@budibase/types"
import * as setup from "./utilities"

describe("/api/deploy", () => {
  let config = setup.getConfig()

  afterAll(() => {
    setup.afterAll()
  })

  beforeAll(async () => {
    await config.init()
  })

  beforeEach(async () => {
    await config.newTenant()
  })

  describe("GET /api/deploy/status", () => {
    it("returns empty state when unpublished", async () => {
      await config.api.workspace.unpublish(config.devWorkspaceId!)
      const res = await config.api.deploy.publishStatus()
      // default screens will appear here
      for (const workspaceApp of Object.values(res.workspaceApps)) {
        expect(workspaceApp.published).toBe(false)
      }
    })

    it("returns disabled state for development-only resources", async () => {
      // Create workspace app
      const { workspaceApp } = await config.api.workspaceApp.create(
        structures.workspaceApps.createRequest({
          name: "Test Workspace App",
          url: "/testapp",
        })
      )

      const res = await config.api.deploy.publishStatus()
      expect(res.workspaceApps[workspaceApp._id!]).toEqual({
        published: false,
        name: workspaceApp.name,
        unpublishedChanges: true,
        state: "disabled",
      })
    })

    it("returns published state after full publish", async () => {
      const { workspaceApp } = await config.api.workspaceApp.create(
        structures.workspaceApps.createRequest({
          name: "Test Workspace App",
          url: "/testapp",
        })
      )

      await config.api.workspace.publish(config.devWorkspace!.appId)

      const res = await config.api.deploy.publishStatus()

      expect(res.workspaceApps[workspaceApp._id!]).toEqual({
        publishedAt: expect.any(String),
        published: true,
        name: workspaceApp.name,
        unpublishedChanges: false,
        state: "published",
      })
    })
  })

  describe("POST /api/deploy", () => {
    beforeAll(async () => {
      await config.init()
    })

    beforeEach(async () => {
      await config.unpublish()
    })

    function expectApp(workspace: WorkspaceApp) {
      return {
        disabled: async (
          disabled: boolean | undefined,
          state: PublishResourceState
        ) => {
          expect(
            (await config.api.workspaceApp.find(workspace._id!)).disabled
          ).toBe(disabled)

          const status = await config.api.deploy.publishStatus()
          expect(status.workspaceApps[workspace._id!]).toEqual(
            expect.objectContaining({
              state,
            })
          )
        },
      }
    }

    async function publishProdApp() {
      await config.api.workspace.publish(config.getDevWorkspaceId())
      await config.api.workspace.sync(config.getDevWorkspaceId())
    }

    it("should define the disable value for all workspace apps when publishing for the first time", async () => {
      const { workspaceApp: publishedApp } =
        await config.api.workspaceApp.create({
          name: "Test App 1",
          url: "/app1",
          disabled: false,
        })
      const { workspaceApp: appWithoutInfo } =
        await config.api.workspaceApp.create({
          name: "Test App 2",
          url: "/app2",
        })
      const { workspaceApp: disabledApp } =
        await config.api.workspaceApp.create(
          structures.workspaceApps.createRequest({
            name: "Disabled App",
            url: "/disabled",
            disabled: true,
          })
        )

      expect(publishedApp.disabled).toBe(false)
      expect(appWithoutInfo.disabled).toBeUndefined()
      expect(disabledApp.disabled).toBe(true)

      // Publish the app for the first time
      await publishProdApp()

      await expectApp(publishedApp).disabled(
        false,
        PublishResourceState.PUBLISHED
      )
      await expectApp(appWithoutInfo).disabled(
        true,
        PublishResourceState.DISABLED
      )
      await expectApp(disabledApp).disabled(true, PublishResourceState.DISABLED)
    })

    it("should not disable workspace apps on subsequent publishes", async () => {
      const { workspaceApp: initialApp } = await config.api.workspaceApp.create(
        {
          name: "Test App 1",
          url: "/app1",
          disabled: undefined,
        }
      )
      await publishProdApp()

      // Remove disabled flag, simulating old apps
      const db = dbCore.getDB(config.getDevWorkspaceId())
      await db.put({
        ...(await config.api.workspaceApp.find(initialApp._id)),
        disabled: undefined,
      })

      const { workspaceApp: secondApp } = await config.api.workspaceApp.create({
        name: "Test App 2",
        url: "/app2",
        disabled: true,
      })
      await publishProdApp()

      await expectApp(initialApp).disabled(
        undefined,
        PublishResourceState.PUBLISHED
      )
      await expectApp(secondApp).disabled(true, PublishResourceState.DISABLED)
    })
  })
})
