import zlib from "node:zlib"
import Router from "@koa/router"
import { auth, env as coreEnv, env as envCore, middleware } from "@supertoolmake/backend-core"
import { cleanupMiddleware as cleanup } from "../middleware/cleanup"
import { currentWorkspaceMiddleware as currentWorkspace } from "../middleware/currentWorkspace"
import { getState } from "../startup"
import { assetRoutes, mainRoutes, publicRoutes, staticRoutes } from "./routes"

export { shutdown } from "./routes/public"

const compress = require("koa-compress")

export const router: Router = new Router()

router.get("/health", async (ctx) => {
  if (getState() !== "ready") {
    ctx.status = 503
    return
  }
  ctx.status = 200
})
router.get("/version", (ctx) => (ctx.body = envCore.VERSION))

router.use(middleware.errorHandling)

router
  .use(
    compress({
      threshold: 2048,
      gzip: {
        flush: zlib.constants.Z_SYNC_FLUSH,
      },
      deflate: {
        flush: zlib.constants.Z_SYNC_FLUSH,
      },
      br: false,
    })
  )
  // re-direct before any middlewares occur
  .redirect("/", "/builder")

// send assets before middleware
router.use(assetRoutes.routes())
router.use(assetRoutes.allowedMethods())

router
  .use(
    auth.buildAuthMiddleware([], {
      publicAllowed: true,
    })
  )
  .use(auth.buildTenancyMiddleware())
  .use(middleware.activeTenant())
  .use(currentWorkspace)

// Add CSP as soon as possible - depends on licensing and currentApp
if (!coreEnv.DISABLE_CONTENT_SECURITY_POLICY) {
  router.use(middleware.csp)
}

router.use(cleanup)

// authenticated routes
for (const route of mainRoutes) {
  router.use(route.routes())
  router.use(route.allowedMethods())
}

router.use(publicRoutes.routes())
router.use(publicRoutes.allowedMethods())

// WARNING - static routes will catch everything else after them this must be last
router.use(staticRoutes.routes())
router.use(staticRoutes.allowedMethods())
