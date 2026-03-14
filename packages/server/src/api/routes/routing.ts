import * as controller from "../controllers/routing"
import { builderRoutes, publicRoutes } from "./endpointGroups"

// gets correct structure for user role
publicRoutes.get("/api/routing/client", controller.clientFetch)
// gets the full structure, not just the correct screen ID for user role
builderRoutes.get("/api/routing", controller.fetch)
