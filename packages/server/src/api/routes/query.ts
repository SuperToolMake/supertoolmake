import { permissions } from "@supertoolmake/backend-core"
import type { Ctx } from "@supertoolmake/types"
import { WORKSPACE_API_CONFIG_ID } from "@supertoolmake/types"
import type { Next } from "koa"
import { authorizedMiddleware as authorized } from "../../middleware/authorized"
import { bodyResource, bodySubResource, paramResource } from "../../middleware/resourceId"
import * as queryController from "../controllers/query"
import {
  generateQueryPreviewValidation,
  generateQueryValidation,
} from "../controllers/query/validation"
import { builderRoutes, endpointGroupList } from "./endpointGroups"

const { PermissionType, PermissionLevel } = permissions

const readRoutes = endpointGroupList.group({
  middleware: authorized(PermissionType.QUERY, PermissionLevel.READ),
  first: false,
})
const writeRoutes = endpointGroupList.group({
  middleware: authorized(PermissionType.QUERY, PermissionLevel.WRITE),
  first: false,
})

const queryDatasourceResource = (ctx: Ctx, next: Next) => {
  if (ctx.request.body?.datasourceId === WORKSPACE_API_CONFIG_ID) {
    return next()
  }
  return bodySubResource("datasourceId", "_id")(ctx, next)
}

const previewDatasourceResource = (ctx: Ctx, next: Next) => {
  if (ctx.request.body?.datasourceId === WORKSPACE_API_CONFIG_ID) {
    return next()
  }
  return bodyResource("datasourceId")(ctx, next)
}

builderRoutes
  .get("/api/queries", queryController.fetchQueries)
  .post("/api/queries", queryDatasourceResource, generateQueryValidation(), queryController.save)
  .post("/api/queries/import/info", queryController.importInfo)
  .post("/api/queries/import", queryController.import)
  .post(
    "/api/queries/preview",
    previewDatasourceResource,
    generateQueryPreviewValidation(),
    queryController.preview
  )
  .delete("/api/queries/:queryId/:revId", paramResource("queryId"), queryController.destroy)

writeRoutes
  // DEPRECATED - use new query endpoint for future work
  .post("/api/queries/:queryId", paramResource("queryId"), queryController.executeV1)
  .post("/api/v2/queries/:queryId", paramResource("queryId"), queryController.executeV2)

readRoutes.get("/api/queries/:queryId", paramResource("queryId"), queryController.find)
