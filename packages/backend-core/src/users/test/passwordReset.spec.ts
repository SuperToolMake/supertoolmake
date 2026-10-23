import type { User } from "@supertoolmake/types"
import { compare, hash } from "../../utils"
import { UserDB } from "../db"

describe("forced password resets", () => {
  const temporaryPassword = "TemporaryPassword123!"
  let user: User
  beforeAll(async () => {
    user = {
      _id: "us_reset",
      email: "reset@example.com",
      tenantId: "default",
      password: await hash(temporaryPassword),
      forceResetPassword: true,
      roles: {},
    }
  })

  it.each([
    undefined,
    "stored hash",
    "current password",
  ])("rejects completing a reset with %s", async (value) => {
    const password =
      value === "stored hash"
        ? user.password
        : value === "current password"
          ? temporaryPassword
          : undefined
    await expect(
      UserDB.buildUser({ ...user, password, forceResetPassword: false }, undefined, "default", user)
    ).rejects.toThrow("A new password must be supplied when completing a forced reset.")
  })

  it("accepts a different password and clears the reset flag", async () => {
    const password = "DifferentPassword123!"
    const result = await UserDB.buildUser(
      { ...user, password, forceResetPassword: false },
      undefined,
      "default",
      user
    )
    expect(result.forceResetPassword).toBe(false)
    expect(await compare(password, result.password!)).toBe(true)
  })

  it("allows unrelated changes while retaining the reset requirement", async () => {
    const result = await UserDB.buildUser(
      { ...user, firstName: "Updated" },
      undefined,
      "default",
      user
    )
    expect(result).toMatchObject({
      firstName: "Updated",
      password: user.password,
      forceResetPassword: true,
    })
  })
})
