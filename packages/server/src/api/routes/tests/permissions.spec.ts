import { roles } from "@budibase/backend-core"
import {
  BuiltinPermissionID,
  Document,
  PermissionLevel,
  Role,
  Row,
  Table,
} from "@budibase/types"
import * as setup from "./utilities"

const { basicRow } = setup.structures
const { BUILTIN_ROLE_IDS } = roles

const HIGHER_ROLE_ID = BUILTIN_ROLE_IDS.BASIC
const STD_ROLE_ID = BUILTIN_ROLE_IDS.PUBLIC

const DEFAULT_TABLE_ROLE_ID = BUILTIN_ROLE_IDS.ADMIN

describe("/permission", () => {
  let request = setup.getRequest()
  let config = setup.getConfig()

  afterAll(setup.afterAll)

  beforeAll(async () => {
    await config.init()
  })

  describe("levels", () => {
    it("should be able to get levels", async () => {
      const res = await request
        .get(`/api/permission/levels`)
        .set(config.defaultHeaders())
        .expect("Content-Type", /json/)
        .expect(200)
      expect(res.body).toBeDefined()
      expect(res.body.length).toEqual(3)
      expect(res.body).toContain("read")
      expect(res.body).toContain("write")
      expect(res.body).toContain("execute")
    })
  })

  describe("table permissions", () => {
    let tableId: string

    beforeEach(async () => {
      const table = await config.createTable()
      tableId = table._id!
      await config.api.permission.add({
        roleId: STD_ROLE_ID,
        resourceId: tableId,
        level: PermissionLevel.READ,
      })
    })

    it("tables should be defaulted to admin", async () => {
      const table = await config.createTable()
      const { permissions } = await config.api.permission.get(table._id!)
      expect(permissions).toEqual({
        read: {
          permissionType: "EXPLICIT",
          role: DEFAULT_TABLE_ROLE_ID,
        },
        write: {
          permissionType: "EXPLICIT",
          role: DEFAULT_TABLE_ROLE_ID,
        },
      })
    })

    describe("add", () => {
      it("should be able to add permission to a role for the table", async () => {
        const res = await request
          .get(`/api/permission/${tableId}`)
          .set(config.defaultHeaders())
          .expect("Content-Type", /json/)
          .expect(200)
        expect(res.body).toEqual({
          permissions: {
            read: { permissionType: "EXPLICIT", role: STD_ROLE_ID },
            write: { permissionType: "EXPLICIT", role: DEFAULT_TABLE_ROLE_ID },
          },
        })
      })

      it("should get resource permissions with multiple roles", async () => {
        await config.api.permission.add({
          roleId: HIGHER_ROLE_ID,
          resourceId: tableId,
          level: PermissionLevel.WRITE,
        })
        const res = await config.api.permission.get(tableId)
        expect(res).toEqual({
          permissions: {
            read: { permissionType: "EXPLICIT", role: STD_ROLE_ID },
            write: { permissionType: "EXPLICIT", role: HIGHER_ROLE_ID },
          },
        })

        const allRes = await request
          .get(`/api/permission`)
          .set(config.defaultHeaders())
          .expect("Content-Type", /json/)
          .expect(200)
        expect(allRes.body[tableId]["read"]).toEqual(STD_ROLE_ID)
        expect(allRes.body[tableId]["write"]).toEqual(HIGHER_ROLE_ID)
      })
    })

    describe("remove", () => {
      it("should be able to remove the permission", async () => {
        await config.api.permission.revoke({
          roleId: STD_ROLE_ID,
          resourceId: tableId,
          level: PermissionLevel.READ,
        })

        const permsRes = await config.api.permission.get(tableId)
        expect(permsRes.permissions[STD_ROLE_ID]).toBeUndefined()
      })
    })

    describe("check public user allowed", () => {
      let row: Row

      beforeEach(async () => {
        row = await config.createRow()
      })

      it("should be able to read the row", async () => {
        // replicate changes before checking permissions
        await config.publish()

        const res = await request
          .get(`/api/${tableId}/rows`)
          .set(config.publicHeaders())
          .expect("Content-Type", /json/)
        // .expect(200)
        expect(res.body[0]._id).toEqual(row._id)
      })

      it("shouldn't allow writing from a public user", async () => {
        const res = await request
          .post(`/api/${tableId}/rows`)
          .send(basicRow(tableId))
          .set(config.publicHeaders())
          .expect("Content-Type", /json/)
          .expect(401)
        expect(res.status).toEqual(401)
      })
    })
  })

  describe("multi-inheritance permissions", () => {
    let table1: Table, table2: Table, role1: Role, role2: Role
    beforeEach(async () => {
      // create new app
      await config.newTenant()
      table1 = await config.createTable()
      table2 = await config.createTable()
      await config.api.row.save(table1._id!, {
        name: "a",
      })
      await config.api.row.save(table2._id!, {
        name: "b",
      })
      role1 = await config.api.roles.save(
        {
          name: "test_1",
          permissionId: BuiltinPermissionID.WRITE,
          inherits: BUILTIN_ROLE_IDS.BASIC,
        },
        { status: 200 }
      )
      role2 = await config.api.roles.save(
        {
          name: "test_2",
          permissionId: BuiltinPermissionID.WRITE,
          inherits: BUILTIN_ROLE_IDS.BASIC,
        },
        { status: 200 }
      )
      await config.api.permission.add({
        roleId: role1._id!,
        level: PermissionLevel.READ,
        resourceId: table1._id!,
      })
      await config.api.permission.add({
        roleId: role2._id!,
        level: PermissionLevel.READ,
        resourceId: table2._id!,
      })
    })

    it("should be unable to search for table 2 using role 1", async () => {
      await config.loginAsRole(role1._id!, async () => {
        const response2 = await config.api.row.search(
          table2._id!,
          {
            query: {},
          },
          { status: 403 }
        )
        expect(response2.rows).toBeUndefined()
      })
    })

    it("should be able to fetch two tables, with different roles, using multi-inheritance", async () => {
      const role3 = await config.api.roles.save({
        name: "role3",
        permissionId: BuiltinPermissionID.WRITE,
        inherits: [role1._id!, role2._id!],
      })

      await config.loginAsRole(role3._id!, async () => {
        const response1 = await config.api.row.search(
          table1._id!,
          {
            query: {},
          },
          { status: 200 }
        )
        const response2 = await config.api.row.search(
          table2._id!,
          {
            query: {},
          },
          { status: 200 }
        )
        expect(response1.rows[0].name).toEqual("a")
        expect(response2.rows[0].name).toEqual("b")
      })
    })
  })

  describe("fetch builtins", () => {
    it("should be able to fetch builtin definitions", async () => {
      const res = await request
        .get(`/api/permission/builtin`)
        .set(config.defaultHeaders())
        .expect("Content-Type", /json/)
        .expect(200)
      expect(Array.isArray(res.body)).toEqual(true)
      const publicPerm = res.body.find(
        (perm: Document) => perm._id === "public"
      )
      expect(publicPerm).toBeDefined()
      expect(publicPerm.permissions).toBeDefined()
      expect(publicPerm.name).toBeDefined()
    })
  })
})
