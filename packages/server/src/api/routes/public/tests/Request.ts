import { User, Table, SearchFilters, Row } from "@budibase/types"
import { HttpMethod, MakeRequestResponse, generateMakeRequest } from "./utils"
import TestConfiguration from "../../../../tests/utilities/TestConfiguration"

type RequestOpts = { internal?: boolean; appId?: string }

type Response<T> = { data: T }

export interface PublicAPIExpectations {
  status?: number
  body?: Record<string, any>
  headers?: Record<string, string>
}

export class PublicAPIRequest {
  private makeRequest: MakeRequestResponse
  private appId: string | undefined

  tables: PublicTableAPI
  rows: PublicRowAPI
  apiKey: string

  private constructor(
    apiKey: string,
    makeRequest: MakeRequestResponse,
    appId?: string
  ) {
    this.apiKey = apiKey
    this.makeRequest = makeRequest
    this.appId = appId
    this.tables = new PublicTableAPI(this)
    this.rows = new PublicRowAPI(this)
  }

  static async init(config: TestConfiguration, user: User, opts?: RequestOpts) {
    const apiKey = await config.generateApiKey(user._id)
    const makeRequest = generateMakeRequest(apiKey, opts)
    return new this(apiKey, makeRequest, opts?.appId)
  }

  opts(opts: RequestOpts) {
    if (opts.appId) {
      this.appId = opts.appId
    }
    this.makeRequest = generateMakeRequest(this.apiKey, opts)
  }

  async send(
    method: HttpMethod,
    endpoint: string,
    body?: any,
    expectations?: PublicAPIExpectations
  ) {
    if (!this.makeRequest) {
      throw new Error("Init has not been called")
    }
    const res = await this.makeRequest(method, endpoint, body, this.appId)
    if (expectations?.status) {
      expect(res.status).toEqual(expectations.status)
    }
    if (expectations?.body) {
      expect(res.body).toEqual(expectations?.body)
    }
    if (expectations?.headers) {
      for (let [header, value] of Object.entries(expectations.headers)) {
        const found = res.headers[header]
        expect(found?.toLowerCase()).toEqual(value)
      }
    }
    return res.body
  }
}

export class PublicTableAPI {
  request: PublicAPIRequest

  constructor(request: PublicAPIRequest) {
    this.request = request
  }

  async create(
    table: Table,
    expectations?: PublicAPIExpectations
  ): Promise<Response<Table>> {
    return this.request.send("post", "/tables", table, expectations)
  }

  async search(
    name: string,
    expectations?: PublicAPIExpectations
  ): Promise<Response<Table[]>> {
    return this.request.send("post", "/tables/search", { name }, expectations)
  }
}

export class PublicRowAPI {
  request: PublicAPIRequest

  constructor(request: PublicAPIRequest) {
    this.request = request
  }

  async create(
    tableId: string,
    row: Row,
    expectations?: PublicAPIExpectations
  ): Promise<Response<Row>> {
    return this.request.send(
      "post",
      `/tables/${tableId}/rows`,
      row,
      expectations
    )
  }

  async search(
    tableId: string,
    query: SearchFilters,
    expectations?: PublicAPIExpectations
  ): Promise<Response<Row[]>> {
    return this.request.send(
      "post",
      `/tables/${tableId}/rows/search`,
      {
        query,
      },
      expectations
    )
  }

  async viewSearch(
    viewId: string,
    query: SearchFilters,
    expectations?: PublicAPIExpectations
  ): Promise<Response<Row[]>> {
    return this.request.send(
      "post",
      `/views/${viewId}/rows/search`,
      {
        query,
      },
      expectations
    )
  }
}
