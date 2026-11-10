import fs from "node:fs"
import path from "node:path"

jest.mock("@supertoolmake/backend-core", () => {
  const actual = jest.requireActual("@supertoolmake/backend-core")
  const tempDir = fs.mkdtempSync("/tmp/bb-file-utils-")
  return {
    ...actual,
    context: {
      getProdWorkspaceId: jest.fn(() => "app_test"),
    },
    objectStore: {
      ...actual.objectStore,
      budibaseTempDir: jest.fn(() => tempDir),
      upload: jest.fn(async ({ filename }: { filename: string }) => ({
        Key: filename,
      })),
      getAppFileUrl: jest.fn(async (key: string) => `https://example.com/${key}`),
    },
  }
})

import { objectStore } from "@supertoolmake/backend-core"
import { uploadFile } from "../fileUtils"

describe("fileUtils.uploadFile", () => {
  afterAll(() => fs.rmSync(objectStore.budibaseTempDir(), { recursive: true, force: true }))

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("reuses an existing file for repeated uploads", async () => {
    const file = {
      fileName: "document",
      extension: ".txt",
      content: "hello",
    }

    await expect(uploadFile(file)).resolves.toEqual(
      expect.objectContaining({ name: "document.txt" })
    )
    await expect(uploadFile({ ...file, content: "replacement" })).resolves.toEqual(
      expect.objectContaining({ name: "document.txt" })
    )

    const destination = path.join(objectStore.budibaseTempDir(), "ai-downloads", "document.txt")
    expect(fs.readFileSync(destination, "utf8")).toBe("hello")
  })

  it("rejects filenames that escape the temp directory", async () => {
    await expect(
      uploadFile({
        fileName: "../outside",
        extension: ".txt",
        content: "must not be written",
      })
    ).rejects.toThrow("Path must be within the SuperToolMake temp directory.")

    expect(objectStore.upload).not.toHaveBeenCalled()
  })
})
