import { auth } from "@supertoolmake/backend-core"
import { z } from "zod"
import * as controller from "../controllers/resource"
import { builderRoutes } from "./endpointGroups"

const duplicateRequestValidator = auth.zodValidator.body(
  z.strictObject({
    toWorkspace: z.string(),
    resources: z.array(z.string()).min(1).optional(),
    copyRows: z.boolean().optional(),
  })
)

builderRoutes.get("/api/resources", controller.getResourceDependencies)
builderRoutes.post(
  "/api/resources/duplicate",
  duplicateRequestValidator,
  controller.duplicateResourceToWorkspace
)
