import { LoginMethod, type UserCtx } from "@supertoolmake/types"

export function isBrowser(ctx: UserCtx) {
  const browser = ctx.userAgent?.browser
  return browser && browser !== "unknown"
}

export function isApiKey(ctx: UserCtx) {
  return ctx.loginMethod === LoginMethod.API_KEY
}
