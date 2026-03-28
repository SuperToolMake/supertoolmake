import {
  type ConnectionInfo,
  DatasourceFeature,
  DatasourceFieldType,
  type Integration,
  type IntegrationBase,
  QueryType,
} from "@budibase/types"
import { Client } from "minio"
import { HOST_ADDRESS } from "./utils"

export interface MinioConfig {
  endpoint: string
  port: number
  useSSL: boolean
  accessKey: string
  secretKey: string
  bucket: string
}

interface MinioQuery {
  json: object | string
  extra: {
    [key: string]: string
  }
}

const getSchema = () => {
  const schema = {
    docs: "https://github.com/minio/minio",
    friendlyName: "MinIO",
    type: "Object store",
    description: "MinIO is a high-performance, S3-compatible object storage system.",
    features: {
      [DatasourceFeature.CONNECTION_CHECKING]: true,
    },
    datasource: {
      endpoint: {
        type: DatasourceFieldType.STRING,
        required: true,
        default: HOST_ADDRESS,
        display: "Endpoint",
      },
      port: {
        type: DatasourceFieldType.NUMBER,
        required: true,
        default: 9000,
        display: "Port",
      },
      useSSL: {
        type: DatasourceFieldType.BOOLEAN,
        required: false,
        default: true,
        display: "Use SSL",
      },
      accessKey: {
        type: DatasourceFieldType.STRING,
        required: true,
        display: "Access Key",
      },
      secretKey: {
        type: DatasourceFieldType.PASSWORD,
        required: true,
        display: "Secret Key",
      },
    },
    query: {
      create: {
        type: QueryType.JSON,
      },
      read: {
        type: QueryType.JSON,
      },
      delete: {
        type: QueryType.JSON,
      },
    },
    extra: {
      bucket: {
        displayName: "Bucket",
        type: DatasourceFieldType.STRING,
        required: true,
      },
      actionType: {
        displayName: "Operation",
        type: DatasourceFieldType.LIST,
        required: true,
        data: {
          create: ["putObject"],
          read: ["getObject", "listObjects", "statObject", "listObjectsV2"],
          delete: ["removeObject", "removeObjects"],
        },
      },
    },
  }
  return schema
}

const SCHEMA: Integration = getSchema()

export class MinioIntegration implements IntegrationBase {
  private config: MinioConfig
  private client: Client

  constructor(config: MinioConfig) {
    this.config = config
    this.client = new Client({
      endPoint: config.endpoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    })
  }

  async testConnection(): Promise<ConnectionInfo> {
    const response: ConnectionInfo = {
      connected: false,
    }
    try {
      const buckets = await this.client.listBuckets()
      response.connected = buckets !== undefined
    } catch (e: any) {
      response.error = e.message as string
    }
    return response
  }

  async create(query: MinioQuery): Promise<unknown> {
    try {
      const { object, metadata, bucketName } = this.parseQuery(query)

      if (query.extra.actionType === "putObject") {
        return await this.client.putObject(bucketName, object as string, metadata as Buffer)
      }

      throw new Error(`actionType ${query.extra.actionType} does not exist for create`)
    } catch (err) {
      console.error("Error writing to MinIO", err)
      throw err
    }
  }

  async read(query: MinioQuery): Promise<unknown> {
    try {
      const { object, bucketName } = this.parseQuery(query)

      switch (query.extra.actionType) {
        case "getObject": {
          const stream = await this.client.getObject(bucketName, object as string)
          const chunks: Uint8Array[] = []
          for await (const chunk of stream) {
            chunks.push(chunk)
          }
          return Buffer.concat(chunks).toString("base64")
        }
        case "listObjects": {
          const prefix =
            typeof query.json === "string" ? query.json : (query.json as any)?.prefix || ""
          const objects: string[] = []
          const stream = this.client.listObjects(bucketName, prefix, true)
          for await (const obj of stream) {
            if (obj.name) {
              objects.push(obj.name)
            }
          }
          return objects
        }
        case "listObjectsV2": {
          const prefix =
            typeof query.json === "string" ? query.json : (query.json as any)?.prefix || ""
          const objects: string[] = []
          const stream = this.client.listObjectsV2(bucketName, prefix, true)
          for await (const obj of stream) {
            if (obj.name) {
              objects.push(obj.name)
            }
          }
          return objects
        }
        case "statObject": {
          return await this.client.statObject(bucketName, object as string)
        }
        default: {
          throw new Error(`actionType ${query.extra.actionType} does not exist for read`)
        }
      }
    } catch (err) {
      console.error("Error reading from MinIO", err)
      throw err
    }
  }

  async delete(query: MinioQuery): Promise<unknown> {
    try {
      const { object, bucketName } = this.parseQuery(query)

      switch (query.extra.actionType) {
        case "removeObject": {
          await this.client.removeObject(bucketName, object as string)
          return { deleted: "ok" }
        }
        case "removeObjects": {
          const objects = Array.isArray(query.json) ? query.json : [query.json]
          const objectNames = objects.map((obj: any) => (typeof obj === "string" ? obj : obj.name))
          for (const objName of objectNames) {
            await this.client.removeObject(bucketName, objName)
          }
          return { deleted: "ok" }
        }
        default: {
          throw new Error(`actionType ${query.extra.actionType} does not exist for delete`)
        }
      }
    } catch (err) {
      console.error("Error deleting from MinIO", err)
      throw err
    }
  }

  private parseQuery(query: MinioQuery): {
    object: string
    metadata?: Buffer
    bucketName: string
  } {
    const bucketName = query.extra.bucket || this.config.bucket
    let object: string = ""
    let metadata: Buffer | undefined

    if (typeof query.json === "string") {
      object = query.json
    } else if (Array.isArray(query.json)) {
      object = query.json[0]?.name || query.json[0]?.object || ""
    } else if (query.json && typeof query.json === "object") {
      object =
        (query.json as any).name || (query.json as any).object || (query.json as any).key || ""
      if ((query.json as any).data) {
        metadata = Buffer.from((query.json as any).data)
      }
    }

    return { object, metadata, bucketName }
  }
}

export default {
  schema: SCHEMA,
  integration: MinioIntegration,
}
