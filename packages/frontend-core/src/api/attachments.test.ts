import { describe, expect, it, vi } from "vitest"
import { buildAttachmentEndpoints } from "./attachments"
import type { BaseAPIClient } from "./types"

describe("object-store uploads", () => {
  it("sends the same authorization context to signing and multipart upload", async () => {
    const api: BaseAPIClient = {
      post: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      invalidateCache: vi.fn(),
      getAppID: vi.fn(),
    }
    const publicUrl = "https://example.com/uploads/file.txt"
    vi.mocked(api.post).mockResolvedValue({ publicUrl })
    const data = new Blob(["uploaded file content"], { type: "text/plain" })
    const destination = {
      bucket: "uploads",
      key: "file.txt",
      componentId: "upload-component",
      screenId: "screen_upload",
    }
    const result = await buildAttachmentEndpoints(api).externalUpload({
      ...destination,
      datasourceId: "datasource_minio",
      data,
      compress: { quality: 80 },
    })
    expect(api.post).toHaveBeenNthCalledWith(1, {
      url: "/api/attachments/datasource_minio/url",
      body: destination,
    })
    const multipart = vi.mocked(api.post).mock.calls[1][0]
    expect(multipart.url).toBe("/api/attachments/datasource_minio/external/upload")
    expect(multipart.json).toBe(false)
    const body = multipart.body as unknown as FormData
    for (const [key, value] of Object.entries(destination)) expect(body.get(key)).toBe(value)
    expect(await (body.get("file") as Blob).text()).toBe("uploaded file content")
    expect(JSON.parse(body.get("compress") as string)).toEqual({ quality: 80 })
    expect(result).toEqual({ publicUrl })
  })
})
