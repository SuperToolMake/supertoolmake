import env from "../../environment"
import * as cloudfront from "../cloudfront"
import * as objectStore from "../objectStore"

// URLs

export const getGlobalFileUrl = async (type: string, name: string, etag?: string) => {
  let file = getGlobalFileS3Key(type, name)
  if (env.CLOUDFRONT_CDN) {
    if (etag) {
      file = `${file}?etag=${etag}`
    }
    return cloudfront.getPresignedUrl(file)
  } else {
    return await objectStore.getPresignedUrl(env.GLOBAL_BUCKET_NAME, file)
  }
}

// KEYS

export const getGlobalFileS3Key = (type: string, name: string) => {
  return `${type}/${name}`
}
