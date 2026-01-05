import { LoginMethod, UserCtx } from "@budibase/types"

export function isBrowser(ctx: UserCtx) {
  const browser = ctx.userAgent?.browser
  return browser && browser !== "unknown"
}

export function isApiKey(ctx: UserCtx) {
  return ctx.loginMethod === LoginMethod.API_KEY
}
