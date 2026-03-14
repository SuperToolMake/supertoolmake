import type { ProcessAttachmentResponse } from "@budibase/types"
import type fs from "fs"
import { type Expectations, TestAPI } from "./base"

export class AttachmentAPI extends TestAPI {
  process = async (
    name: string,
    file: Buffer | fs.ReadStream | string,
    expectations?: Expectations
  ): Promise<ProcessAttachmentResponse> => {
    return await this._post(`/api/attachments/process`, {
      files: { file: { name, file } },
      expectations,
    })
  }

  upload = async (
    tableId: string,
    name: string,
    file: Buffer | fs.ReadStream | string,
    expectations?: Expectations
  ): Promise<ProcessAttachmentResponse> => {
    return await this._post(`/api/attachments/${tableId}/upload`, {
      files: { file: { name, file } },
      expectations,
    })
  }
}
