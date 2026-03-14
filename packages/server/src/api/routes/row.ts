import { permissions } from "@budibase/backend-core"
import { searchRowRequestValidator } from "@budibase/types"
import { authorizedMiddleware as authorized } from "../../middleware/authorized"
import { paramResource, paramSubResource } from "../../middleware/resourceId"
import { validateBody } from "../../middleware/zod-validator"
import * as rowController from "../controllers/row"
import { endpointGroupList } from "./endpointGroups"
import { internalSearchValidator } from "./utils/validators"

const { PermissionType, PermissionLevel } = permissions

const readRoutes = endpointGroupList.group({
  middleware: authorized(PermissionType.TABLE, PermissionLevel.READ),
  first: false,
})
const writeRoutes = endpointGroupList.group({
  middleware: authorized(PermissionType.TABLE, PermissionLevel.WRITE),
  first: false,
})

readRoutes
  .get(
    "/api/:sourceId/:rowId/enrich",
    paramSubResource("sourceId", "rowId"),
    rowController.fetchEnrichedRow
  )
  .get("/api/:sourceId/rows", paramResource("sourceId"), rowController.fetch)
  .get("/api/:sourceId/rows/:rowId", paramSubResource("sourceId", "rowId"), rowController.find)
  .post(
    "/api/:sourceId/search",
    internalSearchValidator(),
    validateBody(searchRowRequestValidator),
    paramResource("sourceId"),
    rowController.search
  )
  // DEPRECATED - this is an old API, but for backwards compat it needs to be
  // supported still
  .post("/api/search/:sourceId/rows", paramResource("sourceId"), rowController.search)

writeRoutes
  .post("/api/:sourceId/rows", paramResource("sourceId"), rowController.save)
  .patch("/api/:sourceId/rows", paramResource("sourceId"), rowController.patch)
  .post("/api/:sourceId/rows/validate", paramResource("sourceId"), rowController.validate)
  .delete("/api/:sourceId/rows", paramResource("sourceId"), rowController.destroy)
  .post("/api/:sourceId/rows/exportRows", paramResource("sourceId"), rowController.exportRows)
