import { auth } from "@supertoolmake/backend-core"
import { ConfigType } from "@supertoolmake/types"
import { z } from "zod"
import * as controller from "../../controllers/global/configs"
import { adminRoutes, loggedInRoutes } from "../endpointGroups"

function smtpValidation() {
  return z.looseObject({
    port: z.number(),
    host: z.string(),
    from: z.email(),
    secure: z.boolean().optional(),
    auth: z
      .strictObject({
        type: z.enum(["login", "oauth2"]).nullable().optional(),
        user: z.string(),
        pass: z.string().nullish().or(z.literal("")),
      })
      .optional(),
  })
}

function settingValidation() {
  return z.looseObject({
    platformUrl: z.string().optional(),
    logoUrl: z.string().nullish().or(z.literal("")),
    docsUrl: z.string().optional(),
    company: z.string(),
  })
}

function googleValidation() {
  return z.looseObject({
    clientID: z.string(),
    clientSecret: z.string(),
    activated: z.boolean(),
  })
}

function oidcValidation() {
  return z.looseObject({
    configs: z.array(
      z.strictObject({
        clientID: z.string(),
        clientSecret: z.string(),
        configUrl: z.string(),
        logo: z.string().nullish().or(z.literal("")),
        name: z.string().nullish().or(z.literal("")),
        uuid: z.string(),
        activated: z.boolean(),
        scopes: z.array(z.unknown()).optional(),
      })
    ),
  })
}

function scimValidation() {
  return z.looseObject({
    enabled: z.boolean(),
  })
}

function buildConfigSaveValidation() {
  const configSchemas: Partial<Record<ConfigType, z.ZodType>> = {
    [ConfigType.SMTP]: smtpValidation(),
    [ConfigType.SETTINGS]: settingValidation(),
    [ConfigType.ACCOUNT]: z.looseObject({}),
    [ConfigType.GOOGLE]: googleValidation(),
    [ConfigType.OIDC]: oidcValidation(),
    [ConfigType.SCIM]: scimValidation(),
  }

  return auth.zodValidator.body(
    z
      .looseObject({
        _id: z.string().optional(),
        _rev: z.string().optional(),
        workspace: z.string().optional(),
        type: z.enum(ConfigType),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
        config: z.unknown(),
      })
      .superRefine((value, ctx) => {
        const schema = configSchemas[value.type]
        if (!schema) {
          return
        }
        const result = schema.safeParse(value.config)
        if (!result.success) {
          ctx.addIssue({ code: "custom", message: result.error.message, path: ["config"] })
        }
      })
  )
}

function buildUploadValidation() {
  return auth.zodValidator.params(
    z.looseObject({
      type: z.enum(ConfigType),
      name: z.string(),
    })
  )
}

function buildConfigGetValidation() {
  return auth.zodValidator.params(
    z.looseObject({
      type: z.enum(ConfigType),
    })
  )
}

adminRoutes
  .post("/api/global/configs", buildConfigSaveValidation(), controller.save)
  .delete("/api/global/configs/:id/:rev", controller.destroy)
  .post("/api/global/configs/upload/:type/:name", buildUploadValidation(), controller.upload)

loggedInRoutes
  .get("/api/global/configs/checklist", controller.configChecklist)
  .get("/api/global/configs/public", controller.publicSettings)
  .get("/api/global/configs/public/oidc", controller.publicOidc)
  .get("/api/global/configs/:type", buildConfigGetValidation(), controller.find)
