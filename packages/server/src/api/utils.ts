import type Router from "@koa/router"
import env from "../environment"
import { budibaseTempDir } from "../utilities/budibaseDir"
import { devClientLibPath } from "../utilities/fileSystem"

export function addFileManagement(router: Router) {
  /* istanbul ignore next */
  router.param("file", async (file: any, ctx: any, next: () => void) => {
    ctx.file = file && file.includes(".") ? file : "index.html"
    if (!ctx.file.startsWith("budibase-client")) {
      return next()
    }
    // test serves from require
    if (env.isTest()) {
      const path = devClientLibPath()
      ctx.devPath = path.split(ctx.file)[0]
    } else if (env.isDev()) {
      // Serving the client library from your local dir in dev
      ctx.devPath = budibaseTempDir()
    }
    return next()
  })
}
