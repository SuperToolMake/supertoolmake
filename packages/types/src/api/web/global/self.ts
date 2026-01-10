import { DevInfo, User } from "../../../documents"
import { LockReason } from "@budibase/types"

export interface GenerateAPIKeyRequest {
  userId?: string
}
export interface GenerateAPIKeyResponse extends DevInfo {}

export interface FetchAPIKeyResponse extends DevInfo {}

export interface GetGlobalSelfResponse extends User {
  lockedBy?: LockReason
  budibaseAccess: boolean
  csrfToken: string
}
