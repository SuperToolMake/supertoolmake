import { Ctx } from "@budibase/types"
import { structures } from "../../../tests"
import * as utils from "../../utils"

describe("utils", () => {
  describe("isServingBuilder", () => {
    let ctx: Ctx

    const expectResult = (result: boolean) =>
      expect(utils.isServingBuilder(ctx)).toBe(result)

    beforeEach(() => {
      ctx = structures.koa.newContext()
    })

    it("returns true if current path is in builder", async () => {
      ctx.path = "/builder/workspace/app_"
      expectResult(true)
    })

    it("returns false if current path doesn't have '/' suffix", async () => {
      ctx.path = "/builder/workspace"
      expectResult(false)

      ctx.path = "/xx"
      expectResult(false)
    })
  })

  describe("isServingBuilderPreview", () => {
    let ctx: Ctx

    const expectResult = (result: boolean) =>
      expect(utils.isServingBuilderPreview(ctx)).toBe(result)

    beforeEach(() => {
      ctx = structures.koa.newContext()
    })

    it("returns true if current path is in builder preview", async () => {
      ctx.path = "/app/app_dev_123456/preview"
      expectResult(true)
    })

    it("returns false if current path is not in builder preview", async () => {
      ctx.path = "/builder"
      expectResult(false)

      ctx.path = "/xx"
      expectResult(false)
    })
  })

  describe("isPublicAPIRequest", () => {
    let ctx: Ctx

    const expectResult = (result: boolean) =>
      expect(utils.isPublicApiRequest(ctx)).toBe(result)

    beforeEach(() => {
      ctx = structures.koa.newContext()
    })

    it("returns true if current path remains to public API", async () => {
      ctx.path = "/api/public/v1/invoices"
      expectResult(true)

      ctx.path = "/api/public/v1"
      expectResult(true)

      ctx.path = "/api/public/v2"
      expectResult(true)

      ctx.path = "/api/public/v21"
      expectResult(true)
    })

    it("returns false if current path doesn't remain to public API", async () => {
      ctx.path = "/api/public"
      expectResult(false)

      ctx.path = "/xx"
      expectResult(false)
    })
  })

  describe("hasCircularStructure", () => {
    it("should detect a circular structure", () => {
      const a: any = { b: "b" }
      const b = { a }
      a.b = b
      expect(utils.hasCircularStructure(b)).toBe(true)
    })

    it("should allow none circular structures", () => {
      expect(utils.hasCircularStructure({ a: "b" })).toBe(false)
    })
  })
})
