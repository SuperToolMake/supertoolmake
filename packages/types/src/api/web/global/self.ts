import { Account, DevInfo, User } from "../../../documents"
import { LockReason } from "@budibase/types"

export interface GenerateAPIKeyRequest {
  userId?: string
}
export interface GenerateAPIKeyResponse extends DevInfo {}

export interface FetchAPIKeyResponse extends DevInfo {}

export interface GetGlobalSelfResponse extends User {
  account?: Account
  lockedBy?: LockReason
  budibaseAccess: boolean
  accountPortalAccess: boolean
  csrfToken: string
}
