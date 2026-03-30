import { middleware } from "@budibase/backend-core"
import Joi from "joi"
import { paramResource } from "../../middleware/resourceId"
import * as rowActionController from "../controllers/rowAction"
import { builderRoutes } from "./endpointGroups"

function rowActionValidator() {
  return middleware.joiValidator.body(
    Joi.object({
      name: Joi.string().required(),
    }),
    { allowUnknown: false }
  )
}

builderRoutes
  .get("/api/tables/:tableId/actions", paramResource("tableId"), rowActionController.find)
  .post(
    "/api/tables/:tableId/actions",
    paramResource("tableId"),
    rowActionValidator(),
    rowActionController.create
  )
  .delete(
    "/api/tables/:tableId/actions/:rowActionId",
    paramResource("tableId"),
    rowActionController.remove
  )
