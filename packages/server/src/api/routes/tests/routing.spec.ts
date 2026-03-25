import { roles } from "@budibase/backend-core"
import { structures } from "@budibase/backend-core/tests"
import type { Screen } from "@budibase/types"
import * as setup from "./utilities"
import { checkBuilderEndpoint, runInProd } from "./utilities/TestFunctions"

const { BUILTIN_ROLE_IDS } = roles
const { basicScreen } = setup.structures
const route = "/test"

// there are checks which are disabled in test env,
// these checks need to be enabled for this test

describe("/routing", () => {
  const config = setup.getConfig()
  let basic: Screen

  afterAll(setup.afterAll)

  beforeAll(async () => {
    await config.init()
    basic = await config.createScreen(basicScreen(route))
    await config.publish()
  })

  describe("fetch", () => {
    it("prevents a public user from accessing development app", async () => {
      await config.withHeaders(
        {
          ...config.publicHeaders({ prodApp: false }),
          "User-Agent": config.browserUserAgent(),
        },
        async () => {
          await runInProd(() => {
            return config.api.routing.client({ status: 302 })
          })
        }
      )
    })

    it("prevents a non builder from accessing development app", async () => {
      await config.withHeaders(
        {
          ...(await config.roleHeaders({
            roleId: BUILTIN_ROLE_IDS.BASIC,
            prodApp: false,
          })),
          "User-Agent": config.browserUserAgent(),
        },
        async () => {
          await runInProd(() => {
            return config.api.routing.client({ status: 302 })
          })
        }
      )
    })

    it("returns the correct routing for basic user", async () => {
      await config.withHeaders(
        await config.roleHeaders({
          roleId: BUILTIN_ROLE_IDS.BASIC,
        }),
        async () => {
          const res = await config.api.routing.client({
            status: 200,
          })
          expect(res.routes).toBeDefined()
          expect(res.routes[route]).toEqual({
            subpaths: {
              [route]: {
                screenId: basic._id,
                roleId: basic.routing.roleId,
              },
            },
          })
        }
      )
    })

    it("shouldn't return screens if workspace app disabled", async () => {
      const { workspaceApp } = await config.api.workspaceApp.create(
        structures.workspaceApps.createRequest({
          name: "Test Workspace App",
          url: "/testapp",
          disabled: true,
        })
      )
      await config.api.screen.save({
        ...basicScreen("/disabled"),
        workspaceAppId: workspaceApp._id!,
      })
      await config.withHeaders(
        await config.roleHeaders({
          roleId: BUILTIN_ROLE_IDS.BASIC,
        }),
        async () => {
          const res = await config.api.routing.client({ status: 200 })
          expect(res.routes["/disabled"]).toBeUndefined()
        }
      )
    })
  })

  describe("fetch all", () => {
    it("make sure it is a builder only endpoint", async () => {
      await checkBuilderEndpoint({
        config,
        method: "GET",
        url: `/api/routing`,
      })
    })
  })
})
