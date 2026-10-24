import { cache, db, Header, objectStore, roles } from "@supertoolmake/backend-core"
import { structures } from "@supertoolmake/backend-core/tests"
import {
  BuiltinPermissionID,
  PermissionLevel,
  type Screen,
  type Workspace,
  type WorkspaceApp,
} from "@supertoolmake/types"
import nock from "nock"
import tk from "timekeeper"
import { USERS_TABLE_SCHEMA } from "../../../constants"
import { WorkspaceStatus } from "../../../db/utils"
import env from "../../../environment"
import { type DatabaseName, getDatasource } from "../../../integrations/tests/utils"
import { basicScreen, basicTable, customScreen } from "../../../tests/utilities/structures"
import * as setup from "./utilities"
import { checkBuilderEndpoint } from "./utilities/TestFunctions"

describe("/applications", () => {
  const config = setup.getConfig()
  let workspace: Workspace

  afterAll(() => {
    setup.afterAll()
  })

  beforeAll(async () => {
    await config.init()
  })

  afterEach(async () => {
    const workspacesToClean = new Set(
      config.allWorkspaces
        .map((workspace) => workspace.appId)
        .filter((workspaceId): workspaceId is string => !!workspaceId)
    )
    config.allWorkspaces = []

    await Promise.all(
      Array.from(workspacesToClean).map(async (id) => {
        await cache.workspace.invalidateWorkspaceMetadata(id)

        try {
          const files = await objectStore.getAllFiles(objectStore.ObjectStoreBuckets.APPS, id)
          const filepaths = Object.keys(files)
          if (filepaths.length) {
            await objectStore.deleteFiles(objectStore.ObjectStoreBuckets.APPS, filepaths)
          }
        } catch (error) {
          if (!(error instanceof Error && error.name === "NoSuchBucket")) {
            throw error
          }
        }

        await db.getDB(id).destroy()
      })
    )
  })

  async function createNewApp() {
    workspace = await config.newTenant()
    await config.publish()
  }

  beforeEach(async () => {
    await createNewApp()
    jest.clearAllMocks()
    nock.cleanAll()
  })

  // These need to go first for the app totals to make sense
  describe("permissions", () => {
    it("should only return apps a user has access to", async () => {
      let user = await config.createUser({
        builder: { global: false },
        admin: { global: false },
      })

      await config.withUser(user, async () => {
        const apps = await config.api.workspace.fetch()
        expect(apps).toHaveLength(0)
      })

      user = await config.globalUser({
        ...user,
        builder: {
          apps: [config.getProdWorkspaceId()],
        },
      })

      await config.withUser(user, async () => {
        const apps = await config.api.workspace.fetch()
        expect(apps).toHaveLength(1)
      })
    })

    it("should only return apps a user has access to through a custom role", async () => {
      let user = await config.createUser({
        builder: { global: false },
        admin: { global: false },
      })

      await config.withUser(user, async () => {
        const apps = await config.api.workspace.fetch()
        expect(apps).toHaveLength(0)
      })

      const role = await config.api.roles.save({
        name: "Test",
        inherits: "PUBLIC",
        permissionId: BuiltinPermissionID.READ_ONLY,
        version: "name",
      })

      user = await config.globalUser({
        ...user,
        roles: {
          [config.getProdWorkspaceId()]: role.name,
        },
      })

      await config.withUser(user, async () => {
        const apps = await config.api.workspace.fetch()
        expect(apps).toHaveLength(1)
      })
    })
  })

  describe("workspace initialization", () => {
    const checkScreenCount = async (expectedCount: number) => {
      const res = await config.api.workspace.getDefinition(config.getDevWorkspaceId())
      expect(res.screens.length).toEqual(expectedCount)
    }

    const checkTableCount = async (expectedCount: number) => {
      const tables = await config.api.table.fetch()
      expect(tables.length).toEqual(expectedCount)
    }

    it("has no sample data by default", async () => {
      expect(workspace.name).toBeDefined()
      expect(workspace._id).toBeDefined()

      // Ensure we created a blank app without sample data
      await config.withApp(workspace, async () => {
        await checkScreenCount(0)
        await checkTableCount(1) // users table
      })
    })

    it("adds the workspace creator to the dev users table", async () => {
      const creator = config.getUser()

      await config.withApp(workspace, async () => {
        const rows = await config.api.row.fetch(USERS_TABLE_SCHEMA._id!)
        const userRow = rows.find((row) => row.email === creator.email)
        expect(userRow).toBeDefined()
        expect(userRow?.roleId).toEqual(roles.BUILTIN_ROLE_IDS.ADMIN)
      })
    })

    it("rejects creating a second workspace during onboarding", async () => {
      await config.api.workspace.create(
        { isOnboarding: "true" },
        {
          status: 409,
          body: { message: "Only one workspace is supported" },
        }
      )
    })

    it("should apply authorization to endpoint", async () => {
      await checkBuilderEndpoint({
        config,
        method: "POST",
        url: `/api/applications`,
        body: { name: "My App" },
      })
    })
  })

  describe("fetch", () => {
    it("lists all applications", async () => {
      const apps = await config.api.workspace.fetch({
        status: WorkspaceStatus.DEV,
      })
      expect(apps.length).toBeGreaterThan(0)
    })
  })

  describe("fetchClientApps", () => {
    const fetchCurrentWorkspaceApps = async () => {
      const { apps } = await config.api.workspace.fetchClientApps()
      return apps.filter((app) => app.prodId === config.getProdWorkspaceId())
    }

    it("should return apps when workspace app are published", async () => {
      const apps = await fetchCurrentWorkspaceApps()
      expect(apps).toHaveLength(1)
      expect(apps[0]).toEqual(
        expect.objectContaining({
          prodId: config.getProdWorkspaceId(),
        })
      )
    })

    it("should return multiple apps when published app with workspace apps exists", async () => {
      await config.api.workspaceApp.create(
        structures.workspaceApps.createRequest({
          name: "Test Workspace App",
          url: "/testapp",
        })
      )
      await config.publish()

      const apps = await fetchCurrentWorkspaceApps()

      expect(apps).toHaveLength(2)

      const testApp = apps.find((a) => a.name === "Test Workspace App")
      expect(testApp).toEqual(
        expect.objectContaining({
          prodId: config.getProdWorkspaceId(),
          name: "Test Workspace App",
          url: `/testapp`,
        })
      )
    })

    it("should handle creating multiple workspace apps", async () => {
      const { workspaceApp: workspaceApp1 } = await config.api.workspaceApp.create(
        structures.workspaceApps.createRequest({
          name: "App One",
          url: "/appone",
        })
      )

      const { workspaceApp: workspaceApp2 } = await config.api.workspaceApp.create(
        structures.workspaceApps.createRequest({
          name: "App Two",
          url: "/apptwo",
        })
      )
      const app = await config.publish()

      const apps = await fetchCurrentWorkspaceApps()

      expect(apps).toHaveLength(3)
      expect(apps).toEqual(
        expect.arrayContaining([
          {
            appId: expect.stringMatching(new RegExp(`^${app.appId}_workspace_app_.+`)),
            name: app.name,
            prodId: app.appId,
            updatedAt: app.updatedAt,
            url: "",
          },
          {
            appId: `${app.appId}_${workspaceApp1._id}`,
            name: "App One",
            prodId: config.getProdWorkspaceId(),
            updatedAt: app.updatedAt,
            url: `/appone`,
          },
          {
            appId: `${app.appId}_${workspaceApp2._id}`,
            name: "App Two",
            prodId: config.getProdWorkspaceId(),
            updatedAt: app.updatedAt,
            url: `/apptwo`,
          },
        ])
      )
    })

    it("should not return workspace apps added after publishing", async () => {
      const { workspaceApp: app1Workspace1 } = await config.api.workspaceApp.create(
        structures.workspaceApps.createRequest({
          name: "App One",
          url: "/appone",
          disabled: false,
        })
      )
      workspace = await config.publish()

      await config.api.workspaceApp.create(
        structures.workspaceApps.createRequest({
          name: "Unpublished app",
          url: "/other",
          disabled: false,
        })
      )

      const apps = await fetchCurrentWorkspaceApps()

      expect(apps).toHaveLength(2)

      expect(apps).toEqual(
        expect.arrayContaining([
          {
            appId: expect.stringMatching(new RegExp(`^${workspace.appId}_workspace_app_.+`)),
            name: workspace.name,
            prodId: workspace.appId,
            updatedAt: workspace.updatedAt,
            url: "",
          },
          {
            appId: `${workspace.appId}_${app1Workspace1._id}`,
            name: "App One",
            prodId: config.getProdWorkspaceId(),
            updatedAt: workspace.updatedAt,
            url: `/appone`,
          },
        ])
      )
    })

    it("should not return disabled apps", async () => {
      const { workspaceApp: app1Workspace1 } = await config.api.workspaceApp.create(
        structures.workspaceApps.createRequest({
          name: "App One",
          url: "/appone",
          disabled: false,
        })
      )

      await config.api.workspaceApp.create(
        structures.workspaceApps.createRequest({
          name: "Another app",
          url: "/other",
          disabled: true,
        })
      )

      workspace = await config.publish()

      const apps = await fetchCurrentWorkspaceApps()

      expect(apps).toHaveLength(2)
      expect(apps).toEqual(
        expect.arrayContaining([
          {
            appId: expect.stringMatching(new RegExp(`^${workspace.appId}_workspace_app_.+`)),
            name: workspace.name,
            prodId: workspace.appId,
            updatedAt: workspace.updatedAt,
            url: "",
          },
          {
            appId: `${workspace.appId}_${app1Workspace1._id}`,
            name: "App One",
            prodId: config.getProdWorkspaceId(),
            updatedAt: workspace.updatedAt,
            url: `/appone`,
          },
        ])
      )
    })
  })

  describe("fetchAppDefinition", () => {
    it("should be able to get an apps definition", async () => {
      const res = await config.api.workspace.getDefinition(workspace.appId)
      expect(res.libraries.length).toEqual(1)
    })
  })

  describe("fetchAppPackage", () => {
    it("should not expose snippets to public calls", async () => {
      const snippets = [{ name: "PrivateSnippet", code: "return 'secret'" }]
      await config.api.workspace.update(workspace.appId, {
        snippets,
      })

      const builderPackage = await config.api.workspace.getAppPackage(workspace.appId)
      expect(builderPackage.application.snippets).toEqual(snippets)

      await config.publish()

      const res = await config.withHeaders({ referer: "http://localhost:10000/app" }, () =>
        config.api.workspace.getAppPackage(config.getProdWorkspaceId(), {
          publicUser: true,
        })
      )

      expect(res.application.snippets).toBeUndefined()
    })

    it("should be able to fetch the app package", async () => {
      const res = await config.api.workspace.getAppPackage(workspace.appId)
      expect(res.application).toBeDefined()
      expect(res.application.appId).toEqual(config.getDevWorkspaceId())
    })

    it("should retrieve all the screens for builder calls", async () => {
      await config.api.screen.save(basicScreen())
      await config.api.screen.save(basicScreen())
      await config.api.screen.save(basicScreen())

      const res = await config.api.workspace.getAppPackage(workspace.appId)

      expect(res.screens).toHaveLength(3) // 3 created screens
    })

    it("should retrieve all the screens for public calls", async () => {
      const [_screen1, screen2, _screen3] = await Promise.all([
        config.api.screen.save(basicScreen()),
        config.api.screen.save(
          customScreen({
            roleId: roles.BUILTIN_ROLE_IDS.PUBLIC,
            route: "/",
          })
        ),
        config.api.screen.save(basicScreen()),
      ])

      await config.publish()
      const res = await config.withHeaders({ referer: `http://localhost:10000/app` }, () =>
        config.api.workspace.getAppPackage(config.getProdWorkspaceId(), {
          publicUser: true,
        })
      )

      expect(res.screens).toHaveLength(1)
      expect(res.screens).toContainEqual(expect.objectContaining({ _id: screen2._id }))
    })

    describe("workspace apps", () => {
      it("should retrieve all the screens for builder calls", async () => {
        await config.api.workspaceApp.create(structures.workspaceApps.createRequest())

        const res = await config.api.workspace.getAppPackage(workspace.appId)

        expect(res.screens).toHaveLength(0)
      })

      describe("should retrieve only the screens for a given workspace app", () => {
        let workspaceAppInfo: {
          workspaceApp: WorkspaceApp
          screens: Screen[]
        }[]

        beforeEach(async () => {
          const appPackage = await config.api.workspace.getAppPackage(workspace.appId)

          let defaultWorkspaceApp: WorkspaceApp | undefined

          const { workspaceApps: allWorkspaceApps } = await config.api.workspaceApp.fetch()
          defaultWorkspaceApp = allWorkspaceApps[0]
          if (!defaultWorkspaceApp) {
            defaultWorkspaceApp = (
              await config.api.workspaceApp.create(
                structures.workspaceApps.createRequest({
                  name: "Default",
                  url: "/",
                })
              )
            ).workspaceApp
          }

          const { workspaceApp: workspaceApp1 } = await config.api.workspaceApp.create(
            structures.workspaceApps.createRequest({
              url: "/app1",
            })
          )
          const { workspaceApp: workspaceApp2 } = await config.api.workspaceApp.create(
            structures.workspaceApps.createRequest({
              url: "/app2",
            })
          )

          workspaceAppInfo = []

          async function createScreens(workspaceApp: WorkspaceApp, routes: string[]) {
            const screens = []

            for (const route of routes) {
              const screen = await config.api.screen.save({
                ...basicScreen(route),
                workspaceAppId: workspaceApp._id!,
              })
              screens.push(screen)
            }

            workspaceAppInfo.push({
              workspaceApp,
              screens,
            })
          }

          await createScreens(defaultWorkspaceApp, ["/page-1"])
          await createScreens(workspaceApp1, ["/", "/page-1", "/page-2"])
          await createScreens(workspaceApp2, ["/", "/page-1"])

          workspaceAppInfo[0].screens.unshift(...appPackage.screens)
        })

        it.each([
          "",
          "/",
        ])("should retrieve only the screens for a the workspace all with empty prefix", async (closingChar) => {
          await config.withHeaders(
            {
              referer: `http://localhost:10000/${config.devWorkspaceId}${closingChar}`,
            },
            async () => {
              const res = await config.api.workspace.getAppPackage(workspace.appId, {
                headers: {
                  [Header.TYPE]: "client",
                },
              })

              expect(res.screens).toHaveLength(1)
              expect(res.screens).toEqual(
                expect.arrayContaining(
                  workspaceAppInfo[0].screens.map((s) => expect.objectContaining({ _id: s._id }))
                )
              )
            }
          )
        })

        it.each([
          "",
          "/",
        ])("should retrieve only the screens for a the workspace from the base url of it", async (closingChar) => {
          const { url } = workspaceAppInfo[1].workspaceApp
          await config.withHeaders(
            {
              referer: `http://localhost:10000/${config.devWorkspaceId}${url}${closingChar}`,
            },
            async () => {
              const res = await config.api.workspace.getAppPackage(workspace.appId, {
                headers: {
                  [Header.TYPE]: "client",
                },
              })

              expect(res.screens).toHaveLength(3)
              expect(res.screens).toEqual(
                expect.arrayContaining(
                  workspaceAppInfo[1].screens.map((s) => expect.objectContaining({ _id: s._id }))
                )
              )
            }
          )
        })

        it("should retrieve only the screens for a the workspace for prod app", async () => {
          await config.publish()
          await config.withProdApp(() =>
            config.withHeaders(
              {
                referer: `http://localhost:10000/app`,
              },
              async () => {
                const res = await config.api.workspace.getAppPackage(config.getDevWorkspaceId(), {
                  headers: {
                    [Header.TYPE]: "client",
                  },
                })

                expect(res.screens).toHaveLength(1)
                expect(res.screens).toEqual(
                  expect.arrayContaining(
                    workspaceAppInfo[0].screens.map((s) => expect.objectContaining({ _id: s._id }))
                  )
                )
              }
            )
          )
        })
      })
    })
  })

  describe("update", () => {
    it("should be able to update the app package", async () => {
      const updatedApp = await config.api.workspace.update(workspace.appId, {
        name: "TEST_APP",
      })
      expect(updatedApp._rev).toBeDefined()
    })
  })

  describe("publish", () => {
    it("should publish app with dev app ID", async () => {
      await config.api.workspace.publish(workspace.appId)
    })

    it("should publish app with prod app ID", async () => {
      await config.api.workspace.publish(workspace.appId.replace("_dev", ""))
    })

    it("should publish table permissions for custom roles correctly", async () => {
      const ds = process.env.DATASOURCE === "none" ? "postgres" : process.env.DATASOURCE
      const rawDatasource = await getDatasource((ds as DatabaseName) || "postgres")
      const datasource = await config.api.datasource.create(rawDatasource!)
      const table = await config.api.table.save(basicTable(datasource))
      expect(table._id).toBeDefined()

      // Create a custom role
      const customRole = await config.api.roles.save({
        name: "TestRole",
        inherits: "PUBLIC",
        permissionId: BuiltinPermissionID.READ_ONLY,
        version: "name",
      })
      expect(customRole._id).toBeDefined()

      // Add READ permission for the custom role on the table
      await config.api.permission.add({
        roleId: customRole._id!,
        resourceId: table._id!,
        level: PermissionLevel.READ,
      })

      // Verify permissions exist in development
      const devPermissions = await config.api.permission.get(table._id!)
      expect(devPermissions.permissions.read.role).toBe(customRole.name)

      // Publish the application
      await config.publish()

      // Verify permissions are correctly published to production
      await config.withProdApp(async () => {
        const prodPermissions = await config.api.permission.get(table._id!)
        expect(prodPermissions.permissions.read.role).toBe(customRole.name)

        // Also verify the role itself exists in production
        const roles = await config.api.roles.fetch()
        const prodRole = roles.find((r) => r.name === customRole.name)
        expect(prodRole).toBeDefined()
        expect(prodRole!.name).toBe("TestRole")
      })
    })
  })

  describe("manage client library version", () => {
    it("should be able to update the app client library version", async () => {
      await config.api.workspace.updateClient(workspace.appId)
    })

    it("should be able to revert the app client library version", async () => {
      await config.api.workspace.updateClient(workspace.appId)
      await config.api.workspace.revertClient(workspace.appId)
    })
  })

  describe("edited at", () => {
    it("middleware should set updatedAt", async () => {
      const updatedApp = await tk.withFreeze(
        "2021-02-01",
        async () =>
          await config.withApp(workspace, () =>
            config.api.workspace.update(workspace.appId, {
              name: "UPDATED_NAME",
            })
          )
      )
      expect(updatedApp._rev).toBeDefined()
      expect(updatedApp.updatedAt).toEqual("2021-02-01T00:00:00.000Z")

      const fetchedApp = await config.api.workspace.get(workspace.appId)
      expect(fetchedApp.updatedAt).toEqual("2021-02-01T00:00:00.000Z")
    })
  })

  describe("sync", () => {
    it("app should sync correctly", async () => {
      const { message } = await config.api.workspace.sync(workspace.appId)
      expect(message).toEqual("App sync completed successfully.")
    })

    it("app should not sync if production", async () => {
      const { message } = await config.withProdApp(() =>
        config.api.workspace.sync(workspace.appId.replace("_dev", ""), {
          status: 400,
        })
      )

      expect(message).toEqual("This action cannot be performed for production apps")
    })

    it("app should not sync if sync is disabled", async () => {
      env._set("DISABLE_AUTO_PROD_APP_SYNC", true)
      const { message } = await config.api.workspace.sync(workspace.appId)
      expect(message).toEqual(
        "App sync disabled. You can reenable with the DISABLE_AUTO_PROD_APP_SYNC environment variable."
      )
      env._set("DISABLE_AUTO_PROD_APP_SYNC", false)
    })
  })

  describe("unpublish", () => {
    it("should unpublish app with dev app ID", async () => {
      await config.api.workspace.unpublish(workspace.appId)
    })

    it("should unpublish app with prod app ID", async () => {
      await config.withProdApp(() =>
        config.api.workspace.unpublish(workspace.appId.replace("_dev", ""))
      )
    })
  })
})
