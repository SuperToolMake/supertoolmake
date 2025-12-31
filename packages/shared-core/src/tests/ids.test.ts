import { DocumentType } from "@budibase/types"
import {
  isDatasourceOrDatasourcePlusId,
  isQueryId,
  isTableId,
  isTableIdOrExternalTableId,
} from "../ids"

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 15)}`
}

describe("ids", () => {
  const oneOfEachId = Object.values(DocumentType).map(makeId)

  describe("isTableId", () => {
    it("should return true for table IDs", () => {
      const found = oneOfEachId.filter(isTableId)
      expect(found.length).toBe(1)
      expect(found[0].startsWith(`${DocumentType.TABLE}_`)).toBe(true)
    })
  })

  describe("isDatasourceOrDatasourcePlusId", () => {
    it("should return true for datasource IDs", () => {
      const found = oneOfEachId.filter(isDatasourceOrDatasourcePlusId)
      expect(found.length).toBe(2)
      expect(
        found.filter(id => id.startsWith(`${DocumentType.DATASOURCE_PLUS}_`))
          .length
      ).toBe(1)
    })
  })

  describe("isTableIdOrExternalTableId", () => {
    it("should return true for table IDs", () => {
      const found = oneOfEachId.filter(isTableIdOrExternalTableId)
      expect(found.length).toBe(1)
      expect(
        found.filter(id => id.startsWith(`${DocumentType.TABLE}_`)).length
      ).toBe(1)
    })

    it("should return true for external table IDs", () => {
      const externalTableId = `${DocumentType.DATASOURCE_PLUS}_12345__${DocumentType.TABLE}_67890`
      expect(isTableIdOrExternalTableId(externalTableId)).toBe(true)
    })
  })

  describe("isQueryId", () => {
    it("should return true for query IDs", () => {
      const found = oneOfEachId.filter(isQueryId)
      expect(found.length).toBe(1)
      expect(found[0].startsWith(`${DocumentType.QUERY}_`)).toBe(true)
    })
  })
})
