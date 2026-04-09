import { context } from "@supertoolmake/backend-core"
import type { Ctx } from "@supertoolmake/types"
import type { Middleware, Next } from "koa"

export const cleanupMiddleware = (async (_ctx: Ctx, next: Next) => {
  const resp = await next()

  const current = context.getCurrentContext()
  if (!current?.cleanup) {
    return resp
  }

  const errors = []
  for (const fn of current.cleanup) {
    try {
      await fn()
    } catch (e) {
      // We catch errors here to ensure we at least attempt to run all cleanup
      // functions. We'll throw the first error we encounter after all cleanup
      // functions have been run.
      errors.push(e)
    }
  }
  delete current.cleanup

  if (errors.length > 0) {
    throw errors[0]
  }

  return resp
}) as Middleware
