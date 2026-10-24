import * as controller from "../../controllers/system/logs"
import { adminRoutes } from "../endpointGroups"

adminRoutes.get("/api/system/logs", controller.getLogs)
