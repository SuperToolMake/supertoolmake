import { Datasource, FieldType, RelationshipType, Table } from "@budibase/types"
import { structures } from "../../../../routes/tests/utilities"
import { buildSqlFieldList } from "../sqlUtils"

import { context } from "@budibase/backend-core"
import { utils } from "@budibase/shared-core"
import {
  DatabaseName,
  datasourceDescribe,
} from "../../../../../integrations/tests/utils"

const descriptions = datasourceDescribe({
  only: [DatabaseName.POSTGRES],
})

if (descriptions.length) {
  describe.each(descriptions)(
    "buildSqlFieldList ($dbName)",
    ({ config, dsProvider }) => {
      let allTables: Record<string, Table>
      let datasource: Datasource

      beforeEach(async () => {
        const ds = await dsProvider()
        datasource = ds.datasource!
        allTables = {}
      })

      class TableConfig {
        private _table: Table

        constructor(name: string) {
          this._table = {
            ...structures.tableForDatasource(datasource),
            name,
            schema: {
              name: {
                name: "name",
                type: FieldType.STRING,
              },
              description: {
                name: "description",
                type: FieldType.STRING,
              },
              amount: {
                name: "amount",
                type: FieldType.NUMBER,
              },
            },
          }
        }

        withHiddenField(field: string) {
          this._table.schema[field].visible = false
          return this
        }

        withField(
          name: string,
          type: FieldType.STRING | FieldType.NUMBER,
          options?: { visible: boolean }
        ) {
          switch (type) {
            case FieldType.NUMBER:
            case FieldType.STRING:
              this._table.schema[name] = {
                name,
                type,
                ...options,
              }
              break
            default:
              utils.unreachable(type)
          }
          return this
        }

        withRelation(name: string, toTableId: string) {
          this._table.schema[name] = {
            name,
            type: FieldType.LINK,
            relationshipType: RelationshipType.ONE_TO_MANY,
            fieldName: "link",
            foreignKey: "link",
            tableId: toTableId,
          }
          return this
        }

        withPrimary(field: string) {
          this._table.primary = [field]
          return this
        }

        withDisplay(field: string) {
          this._table.primaryDisplay = field
          return this
        }

        async create() {
          const table = await config.api.table.save(this._table)
          allTables[table.name] = table
          return table
        }
      }

      const buildSqlFieldListInApp: typeof buildSqlFieldList = async (
        table,
        allTables,
        opts
      ) => {
        return context.doInWorkspaceContext(config.getDevWorkspaceId(), () =>
          buildSqlFieldList(table, allTables, opts)
        )
      }

      describe("table", () => {
        it("extracts fields from table schema", async () => {
          const table = await new TableConfig("table").create()
          const result = await buildSqlFieldListInApp(table, {})
          expect(result).toEqual([
            "table.name",
            "table.description",
            "table.amount",
            "table.id",
          ])
        })

        it("excludes hidden fields", async () => {
          const table = await new TableConfig("table")
            .withHiddenField("description")
            .create()
          const result = await buildSqlFieldListInApp(table, {})
          expect(result).toEqual(["table.name", "table.amount", "table.id"])
        })

        it("includes relationships fields when flagged", async () => {
          const otherTable = await new TableConfig("linkedTable")
            .withField("id", FieldType.NUMBER)
            .withPrimary("id")
            .withDisplay("name")
            .create()

          const table = await new TableConfig("table")
            .withRelation("link", otherTable._id!)
            .create()

          const result = await buildSqlFieldListInApp(table, allTables, {
            relationships: true,
          })
          expect(result).toEqual([
            "table.name",
            "table.description",
            "table.amount",
            "table.id",
            "linkedTable.id",
            "linkedTable.name",
          ])
        })
      })
    }
  )
}
