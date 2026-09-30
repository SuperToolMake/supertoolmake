import { middleware } from "@supertoolmake/backend-core"
import { z } from "zod"

import * as controller from "../controllers/workspaceApp"
import { builderRoutes } from "./endpointGroups"

const baseSchema = {
  name: z.string(),
  url: z.string().regex(/^\/[\w-]*$/),
  disabled: z.boolean().optional(),
}

const insertSchema = z.strictObject({
  ...baseSchema,
})

const updateSchema = z.strictObject({
  _id: z.string(),
  _rev: z.string(),
  ...baseSchema,
  navigation: z.looseObject({}),
})

function workspaceAppValidator(schema: typeof insertSchema | typeof updateSchema) {
  return middleware.zodValidator.body(schema)
}

builderRoutes
  .get("/api/workspaceApp", controller.fetch)
  .get("/api/workspaceApp/:id", controller.find)
  .post("/api/workspaceApp", workspaceAppValidator(insertSchema), controller.create)
  .post("/api/workspaceApp/:id/duplicate", controller.duplicate)
  .put("/api/workspaceApp/:id", workspaceAppValidator(updateSchema), controller.edit)
  .delete("/api/workspaceApp/:id/:rev", controller.remove)
