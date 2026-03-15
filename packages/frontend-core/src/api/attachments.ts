import type { DownloadAttachmentResponse, ProcessAttachmentResponse } from "@budibase/types"
import type { BaseAPIClient } from "./types"

export interface AttachmentEndpoints {
  downloadAttachment: (
    datasourceId: string,
    rowId: string,
    columnName: string
  ) => Promise<DownloadAttachmentResponse>
  uploadAttachment: (tableId: string, data: any) => Promise<ProcessAttachmentResponse>
  uploadBuilderAttachment: (data: any) => Promise<ProcessAttachmentResponse>
}

export const buildAttachmentEndpoints = (API: BaseAPIClient): AttachmentEndpoints => {
  return {
    /**
     * Uploads an attachment to the server.
     * @param data the attachment to upload
     * @param tableId the table ID to upload to
     */
    uploadAttachment: async (tableId, data) => {
      return await API.post({
        url: `/api/attachments/${tableId}/upload`,
        body: data,
        json: false,
      })
    },

    /**
     * Uploads an attachment to the server as a builder user from the builder.
     * @param data the data to upload
     */
    uploadBuilderAttachment: async (data) => {
      return await API.post({
        url: "/api/attachments/process",
        body: data,
        json: false,
      })
    },

    /**
     * Download an attachment from a row given its column name.
     * @param datasourceId the ID of the datasource to download from
     * @param rowId the ID of the row to download from
     * @param columnName the column name to download
     */
    downloadAttachment: async (datasourceId, rowId, columnName) => {
      return await API.get({
        url: `/api/${datasourceId}/rows/${rowId}/attachment/${columnName}`,
        parseResponse: (response) => response as any,
        suppressErrors: true,
      })
    },
  }
}
