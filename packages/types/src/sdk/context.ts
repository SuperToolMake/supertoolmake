import { User } from "../documents"
import { IdentityType, HostInfo } from "./events"

export interface BaseContext {
  _id: string
  type: IdentityType
  tenantId?: string
}

export interface UserContext extends BaseContext, User {
  _id: string
  tenantId: string
  hostInfo: HostInfo
}

export type IdentityContext = BaseContext | UserContext
