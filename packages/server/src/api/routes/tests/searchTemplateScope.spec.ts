import { roles } from "@supertoolmake/backend-core"
import { PermissionLevel, RowExportFormat, type Table } from "@supertoolmake/types"
import { datasourceDescribe } from "../../../integrations/tests/utils"
import { basicTable } from "../../../tests/utilities/structures"

const descriptions = datasourceDescribe({ plus: true })

if (descriptions.length) {
  describe.each(descriptions)("row search bindings ($dbName)", ({ config, dsProvider }) => {
    let table: Table

    beforeAll(async () => {
      const { datasource } = await dsProvider()
      table = await config.api.table.save(basicTable(datasource))
      await config.api.row.save(table._id!, { name: "target" })
      await config.api.permission.add({
        roleId: roles.BUILTIN_ROLE_IDS.BASIC,
        resourceId: table._id!,
        level: PermissionLevel.READ,
      })
      await config.publish()
    })

    it("rejects reader JavaScript and OAuth bindings and allows literal searches", async () => {
      await config.loginAsRole(roles.BUILTIN_ROLE_IDS.BASIC, async () => {
        const code = Buffer.from('return "target"').toString("base64")
        for (const name of [`{{ js "${code}" }}`, "{{ [user].[oauth2].[accessToken] }}"]) {
          await config.api.row.search(table._id!, { query: { equal: { name } } }, { status: 400 })
        }
        const result = await config.api.row.search(table._id!, {
          query: { equal: { name: "target" } },
        })
        expect(result.rows.map((row) => row.name)).toEqual(["target"])
      })
    })

    it("preserves builder JavaScript searches", async () => {
      const code = Buffer.from('return "target"').toString("base64")
      const result = await config.api.row.search(table._id!, {
        query: { equal: { name: `{{ js "${code}" }}` } },
      })
      expect(result.rows.map((row) => row.name)).toEqual(["target"])
    })

    it("exports only the selected column schema and values", async () => {
      const exported = await config.api.row.exportRows(
        table._id!,
        { columns: ["name"] },
        RowExportFormat.JSON_WITH_SCHEMA
      )
      expect(JSON.parse(exported)).toEqual({
        schema: { name: expect.objectContaining({ name: "name" }) },
        rows: [{ name: "target" }],
      })
    })
  })
}
