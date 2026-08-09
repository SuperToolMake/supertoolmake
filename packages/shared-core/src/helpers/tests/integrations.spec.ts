import { SourceName } from "@supertoolmake/types"
import { isSQL } from "../integrations"

describe("integration helpers", () => {
  describe("isSQL", () => {
    it("returns false when the datasource is unavailable", () => {
      expect(isSQL(undefined)).toBe(false)
    })

    it("returns true for SQL datasources", () => {
      expect(isSQL({ source: SourceName.POSTGRES })).toBe(true)
    })
  })
})
