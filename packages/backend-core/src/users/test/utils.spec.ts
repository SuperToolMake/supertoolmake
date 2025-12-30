import { User } from "@budibase/types"
import { structures } from "../../../tests"
import { DBTestConfiguration } from "../../../tests/extra"
import { isCreatorSync } from "../utils"

const config = new DBTestConfiguration()

describe("Users", () => {
  it("User is a creator if it is configured as a global builder", () => {
    const user: User = structures.users.user({ builder: { global: true } })
    expect(isCreatorSync(user)).toBe(true)
  })

  it("User is a creator if it is configured as a global admin", () => {
    const user: User = structures.users.user({ admin: { global: true } })
    expect(isCreatorSync(user)).toBe(true)
  })

  it("User is a creator if it is configured with creator permission", () => {
    const user: User = structures.users.user({ builder: { creator: true } })
    expect(isCreatorSync(user)).toBe(true)
  })

  it("User is a creator if it is a builder in some application", () => {
    const user: User = structures.users.user({ builder: { apps: ["app1"] } })
    expect(isCreatorSync(user)).toBe(true)
  })

  it("User is a creator if it has CREATOR permission in some application", () => {
    const user: User = structures.users.user({ roles: { app1: "CREATOR" } })
    expect(isCreatorSync(user)).toBe(true)
  })

  it("User is a not a creator if it has ADMIN permission in some application", () => {
    const user: User = structures.users.user({ roles: { app1: "ADMIN" } })
    expect(isCreatorSync(user)).toBe(false)
  })
})
