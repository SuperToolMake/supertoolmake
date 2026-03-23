import type {
  DownloadAttachmentResponse,
  GetSignedUploadUrlRequest,
  GetSignedUploadUrlResponse,
  ProcessAttachmentResponse,
} from "@budibase/types"
import type { BaseAPIClient } from "./types"

export interface AttachmentEndpoints {
  downloadAttachment: (
    datasourceId: string,
    rowId: string,
    columnName: string
  ) => Promise<DownloadAttachmentResponse>
  getSignedDatasourceURL: (
    datasourceId: string,
    bucket: string,
    key: string
  ) => Promise<GetSignedUploadUrlResponse>
  uploadAttachment: (tableId: string, data: any) => Promise<ProcessAttachmentResponse>
  uploadBuilderAttachment: (data: any) => Promise<ProcessAttachmentResponse>
  externalUpload: (
    datasourceId: string,
    bucket: string,
    key: string,
    data: any,
    compress?: {
      maxWidth?: number
      quality?: number
    }
  ) => Promise<{ publicUrl: string | undefined }>
}

export const buildAttachmentEndpoints = (API: BaseAPIClient): AttachmentEndpoints => {
  const endpoints: Pick<AttachmentEndpoints, "getSignedDatasourceURL"> = {
    /**
     * Generates a signed URL to upload a file to an external datasource.
     * @param datasourceId the ID of the datasource to upload to
     * @param bucket the name of the bucket to upload to
     * @param key the name of the file to upload to
     */
    getSignedDatasourceURL: async (datasourceId, bucket, key) => {
      return await API.post<GetSignedUploadUrlRequest, GetSignedUploadUrlResponse>({
        url: `/api/attachments/${datasourceId}/url`,
        body: { bucket, key },
      })
    },
  }

  return {
    ...endpoints,
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

    /**
     * Uploads a file to an external datasource.
     * @param datasourceId the ID of the datasource to upload to
     * @param bucket the name of the bucket to upload to
     * @param key the name of the file to upload to
     * @param data the file to upload
     * @param compress optional compression options
     */
    externalUpload: async (datasourceId, bucket, key, data, compress) => {
      const { publicUrl } = await endpoints.getSignedDatasourceURL(datasourceId, bucket, key)
      if (!publicUrl) {
        return { publicUrl: undefined }
      }

      const formData = new FormData()
      formData.append("file", data)
      formData.append("bucket", bucket)
      formData.append("key", key)
      if (compress) {
        formData.append("compress", JSON.stringify(compress))
      }

      await API.post({
        url: `/api/attachments/${datasourceId}/external/upload`,
        body: formData,
        json: false,
      })

      return { publicUrl }
    },
  }
}
