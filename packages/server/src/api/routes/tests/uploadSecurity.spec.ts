import { randomUUID } from "node:crypto"
import { S3 } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { context, roles } from "@supertoolmake/backend-core"
import { type Screen, SourceName } from "@supertoolmake/types"
import sharp from "sharp"
import sdk from "../../../sdk"
import { customScreen } from "../../../tests/utilities/structures"
import { afterAll as cleanup, getConfig, getRequest } from "./utilities"

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://signed.example/upload"),
}))

describe("configured object-store uploads", () => {
  const config = getConfig()
  const request = getRequest()
  let datasourceId: string
  let screen: Screen
  const componentId = "upload-component"
  const upload = () => ({
    bucket: "uploads",
    key: "documents/file.pdf",
    screenId: screen._id,
    componentId,
  })
  const url = () => `/api/attachments/${datasourceId}/url`

  beforeAll(async () => {
    await config.init()
    const datasource = await config.createDatasource({
      datasource: {
        type: "datasource",
        name: "Uploads",
        source: SourceName.MINIO,
        config: {
          endpoint: "localhost",
          port: 9000,
          useSSL: false,
          accessKey: "test",
          secretKey: "test",
        },
      },
    })
    datasourceId = datasource._id
    screen = customScreen({ roleId: roles.BUILTIN_ROLE_IDS.BASIC, route: "/uploads" })
    screen.props._children = [
      {
        _id: componentId,
        _instanceName: "Upload",
        _styles: {},
        _component: "@budibase/standard-components/fileupload",
        datasourceId,
        bucket: "uploads",
        folder: "documents",
      },
    ]
    screen = await config.api.screen.save(screen)
  })
  afterAll(() => cleanup())
  beforeEach(() => jest.clearAllMocks())

  it("signs a configured destination and encodes the public object URL", async () => {
    const response = await request
      .post(url())
      .set(config.defaultHeaders())
      .send({ ...upload(), key: "documents/file #?.pdf" })
      .expect(200)
    expect(response.body.publicUrl).toBe(
      "http://localhost:9000/uploads/documents/file%20%23%3F.pdf"
    )
    expect(getSignedUrl).toHaveBeenCalledTimes(1)
  })

  it.each([
    { bucket: "another-bucket" },
    { key: "elsewhere/file.pdf" },
    { key: "documents/../secret" },
    { componentId: "missing" },
    { screenId: "screen_missing" },
  ])("rejects an unconfigured destination: %j", async (change) => {
    await request
      .post(url())
      .set(config.defaultHeaders())
      .send({ ...upload(), ...change })
      .expect(403)
    expect(getSignedUrl).not.toHaveBeenCalled()
  })

  it("requires screen and component identity", async () => {
    await request
      .post(url())
      .set(config.defaultHeaders())
      .send({ bucket: "uploads", key: "documents/file.pdf" })
      .expect(400)
    expect(getSignedUrl).not.toHaveBeenCalled()
  })

  it("enforces authorization on both upload routes", async () => {
    for (const suffix of ["url", "external/upload"]) {
      await request
        .post(`/api/attachments/${datasourceId}/${suffix}`)
        .set(config.publicHeaders({ prodApp: false }))
        .send(upload())
        .expect(401)
    }
    expect(getSignedUrl).not.toHaveBeenCalled()
  })

  it("rejects a direct server upload outside the configured folder before reading a file", async () => {
    await request
      .post(`/api/attachments/${datasourceId}/external/upload`)
      .set(config.defaultHeaders())
      .field("bucket", "uploads")
      .field("key", "elsewhere/file.pdf")
      .field("screenId", screen._id!)
      .field("componentId", componentId)
      .attach("file", Buffer.from("test"), "test.pdf")
      .expect(403)
  })

  it.each([false, true])("uploads an authorized file with compression %s", async (compress) => {
    const send = jest.spyOn(S3.prototype, "send").mockImplementation(async () => ({}))
    try {
      const file = compress
        ? await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } })
            .png()
            .toBuffer()
        : Buffer.from("test")
      const key = `documents/${randomUUID()}.png`
      const expectedKey = compress ? key.replace(/\.png$/, ".avif") : key
      const uploadRequest = request
        .post(`/api/attachments/${datasourceId}/external/upload`)
        .set(config.defaultHeaders())
        .field("bucket", "uploads")
        .field("key", key)
        .field("screenId", screen._id!)
        .field("componentId", componentId)
      if (compress) uploadRequest.field("compress", JSON.stringify({ quality: 80 }))
      await uploadRequest.attach("file", file, "file.png").expect(200)
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: "uploads",
            Key: expectedKey,
          }),
        })
      )
    } finally {
      send.mockRestore()
    }
  })

  it("allows configured public uploads but still enforces the screen role", async () => {
    await config.doInContext(undefined, async () => {
      await sdk.permissions.setPermissions(datasourceId, {
        readRole: roles.BUILTIN_ROLE_IDS.PUBLIC,
        writeRole: roles.BUILTIN_ROLE_IDS.PUBLIC,
      })
      const db = context.getWorkspaceDB()
      const saved = await db.get<Screen>(screen._id!)
      saved.routing.roleId = roles.BUILTIN_ROLE_IDS.PUBLIC
      await db.put(saved)
    })
    await request
      .post(url())
      .set(config.publicHeaders({ prodApp: false }))
      .send(upload())
      .expect(200)
    await config.doInContext(undefined, async () => {
      const db = context.getWorkspaceDB()
      const saved = await db.get<Screen>(screen._id!)
      saved.routing.roleId = roles.BUILTIN_ROLE_IDS.ADMIN
      await db.put(saved)
    })
    await request
      .post(url())
      .set(config.publicHeaders({ prodApp: false }))
      .send(upload())
      .expect(403)
    expect(getSignedUrl).toHaveBeenCalledTimes(1)
  })

  it("rejects destinations controlled by UI conditions", async () => {
    await config.doInContext(undefined, async () => {
      const db = context.getWorkspaceDB()
      const saved = await db.get<Screen>(screen._id!)
      saved.props._children![0]._conditions = [{ action: "update", setting: "folder" } as any]
      await db.put(saved)
    })
    await request.post(url()).set(config.defaultHeaders()).send(upload()).expect(403)
    expect(getSignedUrl).not.toHaveBeenCalled()
  })
})
