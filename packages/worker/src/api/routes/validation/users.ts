import { auth } from "@supertoolmake/backend-core"
import { z } from "zod"

const OPTIONAL_STRING = z.string().nullish().or(z.literal(""))

const userSchema = {
  email: OPTIONAL_STRING,
  password: OPTIONAL_STRING,
  forceResetPassword: z.boolean().optional(),
  firstName: OPTIONAL_STRING,
  lastName: OPTIONAL_STRING,
  builder: z
    .looseObject({
      global: z.boolean().optional(),
      apps: z.array(z.unknown()).optional(),
    })
    .optional(),
  // maps appId -> roleId for the user
  roles: z.record(z.string(), z.string()),
}

export const buildSelfSaveValidation = () => {
  return auth.zodValidator.body(
    z.strictObject({
      password: z.string().optional(),
      forceResetPassword: z.boolean().optional(),
      firstName: OPTIONAL_STRING,
      lastName: OPTIONAL_STRING,
      freeTrialConfirmedAt: z.string().optional(),
      appFavourites: z.array(z.unknown()).optional(),
      appSort: z.string().optional(),
    })
  )
}

export const buildUserSaveValidation = () => {
  return auth.zodValidator.body(
    z.looseObject({
      ...userSchema,
      _id: z.string().optional(),
      _rev: z.string().optional(),
    })
  )
}

export const buildAddSsoSupport = () => {
  return auth.zodValidator.body(
    z.strictObject({
      ssoId: z.string(),
      email: z.string(),
    })
  )
}

export const buildUserBulkUserValidation = (isSelf = false) => {
  const bulkUserSchema = isSelf
    ? userSchema
    : { ...userSchema, _id: z.string().optional(), _rev: z.string().optional() }
  const bulkSchema = {
    create: z
      .strictObject({
        groups: z.array(z.unknown()).optional(),
        users: z.array(z.looseObject(bulkUserSchema)).optional(),
      })
      .optional(),
    delete: z
      .strictObject({
        users: z
          .array(
            z.looseObject({
              email: z.string().optional(),
              userId: z.string().optional(),
            })
          )
          .optional(),
      })
      .optional(),
  }

  return auth.zodValidator.body(z.looseObject(bulkSchema))
}
