import { permissions } from "@supertoolmake/backend-core"
import { authorizedMiddleware as authorized } from "../../middleware/authorized"
import * as datasourceController from "../controllers/datasource"
import { builderRoutes, endpointGroupList } from "./endpointGroups"
import { datasourceValidator } from "./utils/validators"

const authorizedRoutes = endpointGroupList.group({
  middleware: authorized(permissions.PermissionType.TABLE, permissions.PermissionLevel.READ),
  first: false,
})

builderRoutes
  .get("/api/datasources", datasourceController.fetch)
  .post("/api/datasources/verify", datasourceController.verify)
  .post("/api/datasources/info", datasourceController.information)
  .post("/api/datasources/views", datasourceController.viewInformation)
  .post("/api/datasources/relationships", datasourceController.getRelationshipInformation)
  .post("/api/datasources/:datasourceId/schema", datasourceController.buildSchemaFromSource)
  .post("/api/datasources", datasourceValidator(), datasourceController.save)
  .delete("/api/datasources/:datasourceId/:revId", datasourceController.destroy)

authorizedRoutes
  .get("/api/datasources/:datasourceId", datasourceController.find)
  .put("/api/datasources/:datasourceId", datasourceController.update)
