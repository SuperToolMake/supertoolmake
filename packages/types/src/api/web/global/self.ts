import type { LockReason } from "@supertoolmake/types"
import type { DevInfo, User } from "../../../documents"

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
