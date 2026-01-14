import { it, expect, describe, beforeEach, vi } from "vitest"
import { integrationForDatasource, hasData } from "./selectors"

describe("selectors", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("integrationForDatasource", () => {
    it("returns the integration corresponding to the given datasource", () => {
      expect(
        integrationForDatasource(
          { integrationOne: { some: "data" } },
          { source: "integrationOne" }
        )
      ).toEqual({ some: "data", name: "integrationOne" })
    })

    it("returns null when datasource is undefined", () => {
      expect(integrationForDatasource({}, undefined)).toBe(null)
    })

    it("returns null when datasource has no source", () => {
      expect(integrationForDatasource({}, {})).toBe(null)
    })
  })

  describe("hasData", () => {
    describe("when the user has created a datasource in addition to the premade DB source", () => {
      it("returns true", () => {
        expect(hasData({ list: [1, 1] }, { list: [] })).toBe(true)
      })
    })

    describe("when the user has created a table in addition to the premade users table", () => {
      it("returns true", () => {
        expect(hasData({ list: [] }, { list: [1, 1] })).toBe(true)
      })
    })

    describe("when the user doesn't have data", () => {
      it("returns false", () => {
        expect(hasData({ list: [] }, { list: [] })).toBe(false)
      })
    })
  })
})
