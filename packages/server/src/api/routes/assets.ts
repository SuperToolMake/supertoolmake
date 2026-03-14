import Router from "@koa/router"
import { serveBuilderAssets } from "../controllers/assets"
import { addFileManagement } from "../utils"

const router: Router = new Router()

addFileManagement(router)

router.get("/builder/:file*", serveBuilderAssets)

export default router
