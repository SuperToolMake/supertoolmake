import { middleware, permissions } from "@budibase/backend-core"
import Joi from "joi"
import { authorizedMiddleware as authorized } from "../../middleware/authorized"
import { paramResource } from "../../middleware/resourceId"
import * as rowActionController from "../controllers/rowAction"
import { builderRoutes, endpointGroupList } from "./endpointGroups"

const { PermissionType, PermissionLevel } = permissions

const readRoutes = endpointGroupList.group({
  middleware: authorized(PermissionType.TABLE, PermissionLevel.READ),
  first: false,
})

function rowActionValidator() {
  return middleware.joiValidator.body(
    Joi.object({
      name: Joi.string().required(),
    }),
    { allowUnknown: false }
  )
}

function rowTriggerValidator() {
  return middleware.joiValidator.body(
    Joi.object({
      rowId: Joi.string().required(),
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

readRoutes.post(
  "/api/tables/:sourceId/actions/:rowActionId/trigger",
  paramResource("sourceId"),
  rowTriggerValidator(),
  rowActionController.run
)
