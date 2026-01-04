import { Ctx } from "@budibase/types"
import type { ZodType } from "zod"
import { fromZodError } from "zod-validation-error"

function validate(schema: ZodType, property: "body" | "params") {
  // Return a Koa middleware function
  return async (ctx: Ctx, next: () => void) => {
    if (!schema) {
      return next()
    }

    let params = null
    let setClean: ((data: any) => void) | undefined
    if (ctx[property] != null) {
      params = ctx[property]
      setClean = data => (ctx[property] = data)
    } else if (property === "body" && ctx.request[property] != null) {
      params = ctx.request[property]
      setClean = data => (ctx.request[property] = data)
    } else if (property === "params") {
      params = ctx.request.query
      setClean = data => (ctx.request.query = data)
    }

    const result = schema.safeParse(params)
    if (!result.success) {
      ctx.throw(400, fromZodError(result.error))
    } else {
      setClean?.(result.data)
    }

    return next()
  }
}

export function validateBody(schema: ZodType) {
  return validate(schema, "body")
}
