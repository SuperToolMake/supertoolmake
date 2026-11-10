import { randomUUID as uuid } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { pipeline } from "node:stream"
import { promisify } from "node:util"
import { context, objectStore } from "@supertoolmake/backend-core"
import type { Upload } from "@supertoolmake/types"
import fetch from "node-fetch"
import { ObjectStoreBuckets } from "../constants"

function getTmpPath() {
  const tmpPath = path.join(objectStore.budibaseTempDir(), "ai-downloads")
  if (!fs.existsSync(tmpPath)) {
    fs.mkdirSync(tmpPath)
  }

  return tmpPath
}

export async function uploadUrl(url: string): Promise<Upload | undefined> {
  try {
    const res = await fetch(url)

    const extension = [...res.url.split(".")].pop()!.split("?")[0]

    const destination = path.resolve(getTmpPath(), `${uuid()}${extension}`)
    const fileStream = fs.createWriteStream(destination, { flags: "wx" })

    await promisify(pipeline)(res.body, fileStream)

    const processedFileName = path.basename(destination)

    const s3Key = `${context.getProdWorkspaceId()}/attachments/${processedFileName}`

    const response = await objectStore.upload({
      bucket: ObjectStoreBuckets.APPS,
      filename: s3Key,
      path: destination,
      type: "image/jpeg",
    })

    return {
      size: fileStream.bytesWritten,
      name: processedFileName,
      url: await objectStore.getAppFileUrl(s3Key),
      extension,
      key: response.Key!,
    }
  } catch (e) {
    console.error("Error downloading file", e)
    return
  }
}

export async function uploadFile(file: {
  fileName: string
  extension: string
  content: string
}): Promise<Upload> {
  const tmpPath = path.resolve(getTmpPath())
  const destination = path.resolve(tmpPath, `${file.fileName}${file.extension}`)
  const relativePath = path.relative(tmpPath, destination)
  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error("Path must be within the SuperToolMake temp directory.")
  }

  try {
    fs.writeFileSync(destination, file.content, { flag: "wx" })
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      error.code !== "EEXIST"
    ) {
      throw error
    }
  }

  const processedFileName = path.basename(destination)
  const s3Key = `${context.getProdWorkspaceId()}/attachments/${processedFileName}`

  const response = await objectStore.upload({
    bucket: ObjectStoreBuckets.APPS,
    filename: s3Key,
    path: destination,
    type: "text/plain",
  })

  return {
    size: fs.readFileSync(destination).byteLength,
    name: processedFileName,
    url: await objectStore.getAppFileUrl(s3Key),
    extension: file.extension,
    key: response.Key!,
  }
}
