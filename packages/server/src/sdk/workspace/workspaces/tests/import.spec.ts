import { InternalTable, Table, TableSourceType } from "@budibase/types"
import { isImportableTable } from "../import"

describe("import", () => {
  describe("isImportableTable", () => {
    it("should return true for non-table documents", () => {
      const doc = { _id: "screen_1", type: "screen" }
      expect(isImportableTable(doc as any)).toBe(true)
    })

    it("should return true for external tables", () => {
      const doc: Table = {
        _id: "datasource_postgres_table1",
        type: "table",
        name: "table1",
        sourceType: TableSourceType.EXTERNAL,
        sourceId: "datasource_postgres",
        schema: {},
      }
      expect(isImportableTable(doc as any)).toBe(true)
    })

    it("should return true for ta_users table", () => {
      const doc: Table = {
        _id: InternalTable.USER_METADATA,
        type: "table",
        name: "users",
        sourceType: TableSourceType.INTERNAL,
        sourceId: "bb_internal",
        schema: {},
      }
      expect(isImportableTable(doc as any)).toBe(true)
    })

    it("should return false for custom internal tables", () => {
      const doc: Table = {
        _id: "table_change_request",
        type: "table",
        name: "Change Request",
        sourceType: TableSourceType.INTERNAL,
        sourceId: "bb_internal",
        schema: {},
      }
      expect(isImportableTable(doc as any)).toBe(false)
    })

    it("should handle documents without type property", () => {
      const doc = { _id: "some_doc" }
      expect(isImportableTable(doc as any)).toBe(true)
    })

    it("should handle internal tables without sourceType property", () => {
      const doc = {
        _id: "table_test",
        type: "table",
        name: "test",
        sourceId: "bb_internal",
        schema: {},
      }
      expect(isImportableTable(doc as any)).toBe(false)
    })
  })
})
