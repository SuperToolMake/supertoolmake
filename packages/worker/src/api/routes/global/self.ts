import * as controller from "../../controllers/global/self"
import { builderRoutes, loggedInRoutes } from "../endpointGroups"
import { users } from "../validation"

builderRoutes
  .post("/api/global/self/api_key", controller.generateAPIKey)
  .get("/api/global/self/api_key", controller.fetchAPIKey)

loggedInRoutes
  .get("/api/global/self", controller.getSelf)
  .post("/api/global/self", users.buildSelfSaveValidation(), controller.updateSelf)
