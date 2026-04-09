import { middleware } from "@supertoolmake/backend-core"
import Joi from "joi"

import * as controller from "../controllers/workspaceApp"
import { builderRoutes } from "./endpointGroups"

const baseSchema = {
  name: Joi.string().required(),
  url: Joi.string()
    .required()
    .regex(/^\/[\w-]*$/),
  disabled: Joi.boolean().optional(),
}

const insertSchema = Joi.object({
  ...baseSchema,
})

const updateSchema = Joi.object({
  _id: Joi.string().required(),
  _rev: Joi.string().required(),
  ...baseSchema,
  navigation: Joi.object().required(),
})

function workspaceAppValidator(schema: typeof insertSchema | typeof updateSchema) {
  return middleware.joiValidator.body(schema, { allowUnknown: false })
}

builderRoutes
  .get("/api/workspaceApp", controller.fetch)
  .get("/api/workspaceApp/:id", controller.find)
  .post("/api/workspaceApp", workspaceAppValidator(insertSchema), controller.create)
  .post("/api/workspaceApp/:id/duplicate", controller.duplicate)
  .put("/api/workspaceApp/:id", workspaceAppValidator(updateSchema), controller.edit)
  .delete("/api/workspaceApp/:id/:rev", controller.remove)
