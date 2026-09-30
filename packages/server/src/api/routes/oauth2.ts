import { middleware } from "@supertoolmake/backend-core"
import { OAuth2CredentialsMethod, OAuth2GrantType } from "@supertoolmake/types"
import { z } from "zod"

import * as controller from "../controllers/oauth2"
import { builderRoutes } from "./endpointGroups"

const baseSchema = {
  url: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
  method: z.enum(Object.values(OAuth2CredentialsMethod)),
  grantType: z.enum(Object.values(OAuth2GrantType)),
  scope: z.string().optional(),
}

const insertSchema = z.strictObject({
  name: z.string(),
  ...baseSchema,
})

const updateSchema = z.strictObject({
  _id: z.string(),
  _rev: z.string(),
  name: z.string(),
  ...baseSchema,
})

const validationSchema = z.strictObject({
  _id: z.string().optional(),
  ...baseSchema,
})

function oAuth2ConfigValidator(
  schema: typeof validationSchema | typeof insertSchema | typeof updateSchema
) {
  return middleware.zodValidator.body(schema)
}

builderRoutes
  .get("/api/oauth2", controller.fetch)
  .post("/api/oauth2", oAuth2ConfigValidator(insertSchema), controller.create)
  .put("/api/oauth2/:id", oAuth2ConfigValidator(updateSchema), controller.edit)
  .delete("/api/oauth2/:id/:rev", controller.remove)
  .post("/api/oauth2/validate", oAuth2ConfigValidator(validationSchema), controller.validate)
