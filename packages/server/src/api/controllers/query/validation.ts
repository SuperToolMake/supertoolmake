import { auth } from "@supertoolmake/backend-core"
import { z } from "zod"

const OPTIONAL_STRING = z.string().nullish().or(z.literal(""))

function baseQueryValidation() {
  return {
    _id: OPTIONAL_STRING,
    _rev: OPTIONAL_STRING,
    fields: z.looseObject({}),
    datasourceId: z.string(),
    readable: z.boolean().optional(),
    parameters: z
      .array(
        z.strictObject({
          name: z.string().optional(),
          default: z.string().optional(),
        })
      )
      .optional(),
    queryVerb: z.string(),
    extra: z.looseObject({}).optional(),
    schema: z.looseObject({}),
    transformer: OPTIONAL_STRING,
    flags: z.looseObject({}).optional(),
    queryId: OPTIONAL_STRING,
  }
}

export function queryValidation() {
  return z.looseObject({
    ...baseQueryValidation(),
    name: z.string(),
  })
}

export function generateQueryValidation() {
  // prettier-ignore
  return auth.zodValidator.body(queryValidation())
}

export function generateQueryPreviewValidation() {
  // prettier-ignore
  return auth.zodValidator.body(
    z.looseObject({
      ...baseQueryValidation(),
      name: OPTIONAL_STRING,
    })
  )
}
