jest.mock("@supertoolmake/backend-core", () => {
  const actual = jest.requireActual("@supertoolmake/backend-core")
  return {
    ...actual,
    logging: {
      ...actual.logging,
      system: {
        ...actual.logging.system,
        getLogReadStream: jest.fn(() => require("node:stream").Readable.from(["system log\n"])),
      },
    },
  }
})

import { TestConfiguration } from "../../../../tests"

describe("/api/system/logs", () => {
  const config = new TestConfiguration()

  beforeAll(() => config.beforeAll())
  afterAll(() => config.afterAll())

  it("allows administrators to download system logs", async () => {
    await config.request
      .get("/api/system/logs")
      .set(config.defaultHeaders())
      .expect("Content-Disposition", /attachment; filename=.*\.log/)
      .expect(200)
  })

  it("rejects unauthenticated log downloads", async () => {
    await config.request.get("/api/system/logs").expect(403)
  })

  it("rejects log downloads by builders without administrator access", async () => {
    const builder = await config.createUser({
      builder: { global: true },
      admin: { global: false },
    })
    await config.createSession(builder)
    await config.request.get("/api/system/logs").set(config.authHeaders(builder)).expect(403)
  })
})
