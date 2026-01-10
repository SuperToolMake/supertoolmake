import {
  FetchUserMetadataResponse,
  FindUserMetadataResponse,
  UserMetadata,
} from "@budibase/types"
import { Expectations, TestAPI } from "./base"
import { DocumentInsertResponse } from "nano"

export class UserAPI extends TestAPI {
  fetch = async (
    expectations?: Expectations
  ): Promise<FetchUserMetadataResponse> => {
    return await this._get<FetchUserMetadataResponse>("/api/users/metadata", {
      expectations,
    })
  }

  find = async (
    id: string,
    expectations?: Expectations
  ): Promise<FindUserMetadataResponse> => {
    return await this._get<FindUserMetadataResponse>(
      `/api/users/metadata/${id}`,
      {
        expectations,
      }
    )
  }

  update = async (
    user: UserMetadata,
    expectations?: Expectations
  ): Promise<DocumentInsertResponse> => {
    return await this._put<DocumentInsertResponse>("/api/users/metadata", {
      body: user,
      expectations,
    })
  }

  updateSelf = async (
    user: UserMetadata,
    expectations?: Expectations
  ): Promise<DocumentInsertResponse> => {
    return await this._post<DocumentInsertResponse>(
      "/api/users/metadata/self",
      {
        body: user,
        expectations,
      }
    )
  }

  destroy = async (
    id: string,
    expectations?: Expectations
  ): Promise<{ message: string }> => {
    return await this._delete<{ message: string }>(
      `/api/users/metadata/${id}`,
      {
        expectations,
      }
    )
  }
}
