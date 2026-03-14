import * as controller from "../controllers/permission"
import { builderRoutes } from "./endpointGroups"
import { permissionValidator } from "./utils/validators"

builderRoutes
  .get("/api/permission/builtin", controller.fetchBuiltin)
  .get("/api/permission/levels", controller.fetchLevels)
  .get("/api/permission", controller.fetch)
  .get("/api/permission/:resourceId", controller.getResourcePerms)
  // adding a specific role/level for the resource overrides the underlying access control
  .post(
    "/api/permission/:roleId/:resourceId/:level",
    permissionValidator(),
    controller.addPermission
  )
  // deleting the level defaults it back the underlying access control for the resource
  .delete(
    "/api/permission/:roleId/:resourceId/:level",
    permissionValidator(),
    controller.removePermission
  )
