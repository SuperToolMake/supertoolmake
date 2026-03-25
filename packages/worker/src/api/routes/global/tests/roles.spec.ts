import { context, db, roles } from "@budibase/backend-core"
import { BuiltinPermissionID, type Database } from "@budibase/types"
import { structures, TestConfiguration } from "../../../../tests"

jest.mock("@budibase/backend-core", () => {
  const core = jest.requireActual("@budibase/backend-core")
  return {
    ...core,
    db: {
      ...core.db,
    },
    context: {
      ...core.context,
      getWorkspaceDB: jest.fn(),
    },
  }
})

let workspaceId: string
let workspaceDb: Database
const ROLE_NAME = "newRole"

async function addAppMetadata() {
  await workspaceDb.put({
    _id: "app_metadata",
    appId: workspaceId,
    name: "New App",
    version: "version",
    url: "url",
  })
}

describe("/api/global/roles", () => {
  const config = new TestConfiguration()

  const role = new roles.Role(
    db.generateRoleID(ROLE_NAME),
    ROLE_NAME,
    BuiltinPermissionID.READ_ONLY,
    { displayName: roles.BUILTIN_ROLE_IDS.BASIC }
  )

  beforeAll(async () => {
    await config.beforeAll()
  })

  beforeEach(async () => {
    workspaceId = db.generateWorkspaceID({
      tenantId: config.tenantId,
      random: true,
    })
    workspaceDb = db.getDB(workspaceId)
    const mockWorkspaceDB = context.getWorkspaceDB as jest.Mock
    mockWorkspaceDB.mockReturnValue(workspaceDb)

    await addAppMetadata()
    await workspaceDb.put(role)
  })

  afterAll(async () => {
    await config.afterAll()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("GET /api/global/roles", () => {
    it("retrieves roles", async () => {
      const res = await config.api.roles.get()
      expect(res.body).toBeDefined()
      expect(res.body[workspaceId].roles.length).toEqual(5)
      expect(res.body[workspaceId].roles.map((r: any) => r._id)).toContain(ROLE_NAME)
    })
  })

  describe("GET api/global/roles/:appId", () => {
    it("finds a role by appId", async () => {
      const res = await config.api.roles.find(workspaceId)
      expect(res.body).toBeDefined()
      expect(res.body.name).toEqual("New App")
    })
  })

  describe("DELETE /api/global/roles/:appId", () => {
    async function createBuilderUser(forWorkspaces: string[] = []) {
      const builderUser = structures.users.builderUser()
      builderUser.builder.apps = [...(builderUser.builder.apps || []), ...forWorkspaces]

      const saveResponse = await config.api.users.saveUser(builderUser, 200)
      const { body: user } = await config.api.users.getUser(saveResponse.body._id)
      await config.login(user)
      return user
    }

    it("removes an app role", async () => {
      const user = structures.users.user()
      user.roles = {
        app_test: "role1",
      }
      const userResponse = await config.createUser(user)
      const res = await config.api.roles.remove(workspaceId)
      const updatedUser = await config.api.users.getUser(userResponse._id!)
      expect(updatedUser.body.roles).not.toHaveProperty(workspaceId)
      expect(res.body.message).toEqual("App role removed from all users")
    })

    it("should allow creator users to remove app roles for workspaces they owe", async () => {
      const builderUser = await createBuilderUser([workspaceId])

      const res = await config.withUser(builderUser, () =>
        config.api.roles.remove(workspaceId, { status: 200 })
      )
      expect(res.body).toEqual({ message: "App role removed from all users" })
    })

    it("should not allow creator users to remove app roles for workspaces they don't owe", async () => {
      const builderUser = await createBuilderUser()

      const res = await config.withUser(builderUser, () =>
        config.api.roles.remove(workspaceId, { status: 403 })
      )
      expect(res.body.message).toBe("Workspace Admin/Builder user only endpoint.")
    })
  })
})
