import { permissions } from "@supertoolmake/backend-core"
import { authorizedMiddleware as authorized } from "../../middleware/authorized"
import * as controller from "../controllers/workspaceApis"
import { builderRoutes } from "./endpointGroups"

const { PermissionType, PermissionLevel } = permissions

builderRoutes
  .get(
    "/api/workspace/apis",
    authorized(PermissionType.QUERY, PermissionLevel.READ),
    controller.fetch
  )
  .put(
    "/api/workspace/apis",
    authorized(PermissionType.QUERY, PermissionLevel.WRITE),
    controller.update
  )
