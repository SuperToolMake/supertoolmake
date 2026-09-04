import { URL } from "node:url"
import type { JSONOutput } from "curlconverter"
import type { Query } from "../../../../../definitions/common"
import { type GetQueriesOptions, type ImportInfo, ImportSource } from "./base"

const parseCurl = async (data: string): Promise<JSONOutput> => {
  const { toJsonObject } = await import("curlconverter")
  return toJsonObject(data)
}

/**
 * The curl converter parses the request body into the key field of an object
 * e.g. --d '{"key":"val"}' produces an object { "{"key":"val"}" : "" }
 * This is not what we want, so we need to parse out the key from the object
 */
const parseBody = (curl: JSONOutput) => {
  if (curl.data) {
    if (typeof curl.data === "string") {
      try {
        return JSON.parse(curl.data)
      } catch {
        return curl.data
      }
    }
    const keys = Object.keys(curl.data)
    if (keys.length) {
      let key = keys[0]
      try {
        if (key.startsWith("$")) {
          key = key.substring(1)
        }
        return JSON.parse(key)
      } catch {
        // do nothing
      }
    }
  }
  return
}

const parseCookie = (curl: JSONOutput) => {
  if (curl.cookies) {
    return Object.entries(curl.cookies).reduce((acc, entry) => {
      const [key, value] = entry
      return `${acc}${key}=${value}; `
    }, "")
  }

  return null
}

/**
 * Curl
 * https://curl.se/docs/manpage.html
 */
export class Curl extends ImportSource {
  curl: JSONOutput | undefined

  private getCurl(): JSONOutput {
    if (!this.curl) {
      throw new Error("Curl not parsed, call isSupported first")
    }
    return this.curl
  }

  isSupported = async (data: string): Promise<boolean> => {
    try {
      this.curl = await parseCurl(data)
    } catch (e) {
      console.error("curl parse failed", e)
      return false
    }
    return true
  }

  getUrl = (): URL => {
    return new URL(this.getCurl().raw_url)
  }

  getInfo = async (): Promise<ImportInfo> => {
    const curl = this.getCurl()
    const url = this.getUrl()
    const method = curl.method
    const path = url.pathname
    return {
      name: url.hostname,
      url: url.origin,
      securityHeaders: this.getSecurityHeaders(),
      endpoints: [
        {
          id: this.buildEndpointId(method, path),
          name: path || url.hostname,
          method: method?.toUpperCase(),
          path,
          queryVerb: this.verbFromMethod(method),
        },
      ],
    }
  }

  getImportSource(): string {
    return "curl"
  }

  getQueries = async (datasourceId: string, options?: GetQueriesOptions): Promise<Query[]> => {
    const curl = this.getCurl()
    const url = this.getUrl()
    const name = url.pathname
    const path = url.origin + url.pathname
    const method = curl.method
    const queryString = url.search
    const headers = curl.headers ?? {}
    const requestBody = parseBody(curl)
    const filterIds = options?.filterIds
    const endpointId = this.buildEndpointId(method, url.pathname)

    if (filterIds && !filterIds.has(endpointId)) {
      return []
    }

    const cookieHeader = parseCookie(curl)
    if (cookieHeader) {
      headers.Cookie = cookieHeader
    }

    const query = this.constructQuery(
      datasourceId,
      name,
      method,
      path,
      undefined,
      queryString,
      headers,
      [],
      requestBody
    )

    return [query]
  }
}
