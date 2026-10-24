import { db as dbCore, roles } from "@supertoolmake/backend-core"
import type { User } from "@supertoolmake/types"
import * as setup from "./utilities"

describe("/api/applications/:appId/sync", () => {
  const config = setup.getConfig()
  let user: User

  afterAll(setup.afterAll)

  beforeAll(async () => {
    await config.init()
    // create some users which we will use throughout the tests
    user = await config.createUser({
      builder: { global: false },
      roles: {
        [config.getProdWorkspaceId()]: roles.BUILTIN_ROLE_IDS.BASIC,
      },
    })
  })

  async function getUserMetadata() {
    const { rows } = await config.searchRows(dbCore.InternalTable.USER_METADATA)
    return rows
  }

  it("make sure that user metadata is correctly sync'd", async () => {
    const rows = await getUserMetadata()
    // Other suites share the single tenant, so check this suite's users rather
    // than the total number of synced users.
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          _id: dbCore.generateUserMetadataID(config.getUser()._id),
        }),
        expect.objectContaining({
          _id: dbCore.generateUserMetadataID(user._id!),
          email: user.email,
          roleId: roles.BUILTIN_ROLE_IDS.BASIC,
        }),
      ])
    )
  })
})
