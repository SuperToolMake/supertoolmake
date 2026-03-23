import { ensureTenantAppOwnershipMiddleware } from "../../middleware/ensureTenantAppOwnership"
import * as controller from "../controllers/backup"
import { builderRoutes } from "./endpointGroups"

builderRoutes
  .post("/api/backups/export", ensureTenantAppOwnershipMiddleware, controller.exportWorkspaceDump)
  .delete("/api/backups/logs", controller.clearBackupError)
