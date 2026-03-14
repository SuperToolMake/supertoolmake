import env from "../../../environment"
import * as controller from "../../controllers/system/logs"
import { adminRoutes } from "../endpointGroups"

if (env.SELF_HOSTED) {
  adminRoutes.get("/api/system/logs", controller.getLogs)
}
