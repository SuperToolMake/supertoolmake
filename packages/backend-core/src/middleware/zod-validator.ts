import type { Ctx } from "@supertoolmake/types"
import { type ZodType, z } from "zod"

function validate(schema: ZodType, property: "body" | "params", opts?: { errorPrefix?: string }) {
  return async (ctx: Ctx, next: () => Promise<void>) => {
    const params = property === "body" ? ctx.request.body : ctx.params
    const validationSchema =
      schema instanceof z.ZodObject
        ? schema.extend({
            createdAt: z.unknown().optional(),
            updatedAt: z.unknown().optional(),
          })
        : schema
    const result = validationSchema.safeParse(params)

    if (!result.success) {
      const details = result.error.issues
        .map(({ path, message }) => `${path.join(".")}: ${message}`)
        .join("; ")
      const errorPrefix = opts?.errorPrefix ?? `Invalid ${property}`
      ctx.throw(400, errorPrefix ? `${errorPrefix} - ${details}` : details)
    }

    if (property === "body") {
      ctx.request.body = result.data
    } else {
      ctx.params = result.data
    }

    return next()
  }
}

export function body(schema: ZodType, opts?: { errorPrefix?: string }) {
  return validate(schema, "body", opts)
}

export function params(schema: ZodType, opts?: { errorPrefix?: string }) {
  return validate(schema, "params", opts)
}
