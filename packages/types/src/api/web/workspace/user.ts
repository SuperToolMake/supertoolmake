import type { DocumentInsertResponse } from "nano"
import type { ContextUserMetadata, UserMetadata } from "../../.."

export type FetchUserMetadataResponse = ContextUserMetadata[]
export type FindUserMetadataResponse = ContextUserMetadata

export type SelfResponse = ContextUserMetadata | {}

export interface UpdateSelfMetadataRequest extends UserMetadata {}
export interface UpdateSelfMetadataResponse extends DocumentInsertResponse {}

export interface UpdateUserMetadataRequest extends UserMetadata {}
export interface UpdateUserMetadataResponse extends DocumentInsertResponse {}

export interface DeleteUserMetadataResponse {
  message: string
}
