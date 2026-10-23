import type {
  DownloadAttachmentResponse,
  GetSignedUploadUrlRequest,
  GetSignedUploadUrlResponse,
  ProcessAttachmentResponse,
} from "@supertoolmake/types"
import type { BaseAPIClient } from "./types"

interface SignedDatasourceUpload extends GetSignedUploadUrlRequest {
  datasourceId: string
}
interface ExternalUpload extends SignedDatasourceUpload {
  data: Blob
  compress?: { maxWidth?: number; quality?: number }
}

export interface AttachmentEndpoints {
  downloadAttachment: (
    datasourceId: string,
    rowId: string,
    columnName: string
  ) => Promise<DownloadAttachmentResponse>
  getSignedDatasourceURL: (upload: SignedDatasourceUpload) => Promise<GetSignedUploadUrlResponse>
  uploadAttachment: (tableId: string, data: any) => Promise<ProcessAttachmentResponse>
  uploadBuilderAttachment: (data: any) => Promise<ProcessAttachmentResponse>
  externalUpload: (upload: ExternalUpload) => Promise<{ publicUrl: string | undefined }>
}

export const buildAttachmentEndpoints = (API: BaseAPIClient): AttachmentEndpoints => {
  const endpoints: Pick<AttachmentEndpoints, "getSignedDatasourceURL"> = {
    /**
     * Generates a signed URL to upload a file to an external datasource.
     * @param upload the configured upload destination
     */
    getSignedDatasourceURL: async ({ datasourceId, ...upload }) => {
      return await API.post<GetSignedUploadUrlRequest, GetSignedUploadUrlResponse>({
        url: `/api/attachments/${datasourceId}/url`,
        body: upload,
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
     * @param upload the configured upload destination
     * @param data the file to upload
     * @param compress optional compression options
     */
    externalUpload: async ({ data, compress, ...upload }) => {
      const { datasourceId, bucket, key, componentId, screenId } = upload
      const { publicUrl } = await endpoints.getSignedDatasourceURL(upload)
      if (!publicUrl) {
        return { publicUrl: undefined }
      }

      const formData = new FormData()
      formData.append("file", data)
      formData.append("bucket", bucket)
      formData.append("key", key)
      formData.append("componentId", componentId)
      formData.append("screenId", screenId)
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
