import type { File } from "formidable"
import type { Context, Request } from "koa"
import type { UserAgentContext } from "koa-useragent"
import type { Role, User, UserRoles, UserSSO } from "../documents"

export enum LoginMethod {
  API_KEY = "api_key",
  COOKIE = "cookie",
}

export interface BBUploadedFile extends File {
  path?: File["filepath"]
  name?: File["originalFilename"]
  type?: File["mimetype"]
}

export type BBFiles = Record<string, BBUploadedFile | BBUploadedFile[]>

export interface ContextUser extends Omit<User & Partial<UserSSO>, "roles"> {
  globalId?: string
  userId?: string
  roleId?: string | null
  role?: Role
  roles?: UserRoles
  csrfToken?: string
}

/**
 * Add support for koa-body in context.
 */
export interface BBRequest<RequestBody> extends Request {
  body: RequestBody
  files?: BBFiles
}

/**
 * Basic context with no user.
 */
export interface Ctx<
  RequestBody = any,
  ResponseBody = any,
  Params extends Record<string, any> = any,
> extends Context {
  params: Params
  request: BBRequest<RequestBody>
  body: ResponseBody
  userAgent: UserAgentContext["userAgent"]
  state: { nonce?: string }
}

/**
 * Authenticated context.
 */
export interface UserCtx<
  RequestBody = any,
  ResponseBody = any,
  Params extends Record<string, any> = any,
> extends Ctx<RequestBody, ResponseBody, Params> {
  user: ContextUser
  state: { nonce?: string }
  roleId?: string
  loginMethod?: LoginMethod
}

/**
 * @deprecated: Use UserCtx / Ctx appropriately
 * Authenticated context.
 */
export interface BBContext extends Ctx {
  user?: ContextUser
}
