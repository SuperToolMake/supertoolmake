import { structures } from "../../../tests"
import { env, context } from "@budibase/backend-core"
import { db as userDb } from "../"

describe("users", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("isPreventPasswordActions", () => {
    it("returns false for non sso user", async () => {
      await context.doInTenant(structures.tenant.id(), async () => {
        const user = structures.users.user()
        const result = await userDb.isPreventPasswordActions(user)
        expect(result).toBe(false)
      })
    })

    it("returns true for sso user", async () => {
      await context.doInTenant(structures.tenant.id(), async () => {
        const user = structures.users.ssoUser()
        const result = await userDb.isPreventPasswordActions(user)
        expect(result).toBe(true)
      })
    })

    describe("enforced sso", () => {
      it("returns true for all users when sso is enforced", async () => {
        await context.doInTenant(structures.tenant.id(), async () => {
          const user = structures.users.user()
          const result = await userDb.isPreventPasswordActions(user)
          expect(result).toBe(true)
        })
      })
    })

    describe("sso maintenance mode", () => {
      beforeEach(() => {
        env._set("ENABLE_SSO_MAINTENANCE_MODE", true)
      })

      afterEach(() => {
        env._set("ENABLE_SSO_MAINTENANCE_MODE", false)
      })

      describe("non-admin user", () => {
        it("returns true", async () => {
          const user = structures.users.ssoUser()
          const result = await userDb.isPreventPasswordActions(user)
          expect(result).toBe(true)
        })
      })

      describe("admin user", () => {
        it("returns false", async () => {
          const user = structures.users.ssoUser({
            user: structures.users.adminUser(),
          })
          const result = await userDb.isPreventPasswordActions(user)
          expect(result).toBe(false)
        })
      })
    })
  })
})
