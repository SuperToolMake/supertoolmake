import { Constants } from "@budibase/frontend-core"
import type { User as UserDoc } from "@budibase/types"

export interface UserInfo {
  email: string
  password: string
  forceResetPassword?: boolean
  role: keyof typeof Constants.BudibaseRoles
}

export interface User extends UserDoc {
  tenantOwnerEmail?: string
}

export interface EnrichedUser extends User {
  name: string
  apps: string[]
  access: number
}

export interface ParsedInvite {
  _id: string
  email: string
  builder?: {
    global: boolean
  }
  admin?: {
    global: boolean
  }
  apps?: string[]
}
