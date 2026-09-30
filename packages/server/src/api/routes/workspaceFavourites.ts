import { middleware } from "@supertoolmake/backend-core"
import { WorkspaceResource } from "@supertoolmake/types"
import { z } from "zod"
import * as controller from "../controllers/workspaceFavourites"
import { builderRoutes } from "./endpointGroups"

function workspaceFavouriteValidator(schema: typeof insertSchema) {
  return middleware.zodValidator.body(schema)
}

const baseSchema = {
  resourceType: z.enum(Object.values(WorkspaceResource)).optional(),
  resourceId: z.string().optional(),
}

const insertSchema = z.strictObject({
  ...baseSchema,
})

builderRoutes
  .get("/api/workspace/favourites", controller.fetch)
  .post("/api/workspace/favourites", workspaceFavouriteValidator(insertSchema), controller.create)
  .delete("/api/workspace/favourites/:id/:rev", controller.destroy)
