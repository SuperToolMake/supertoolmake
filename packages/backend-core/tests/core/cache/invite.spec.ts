import * as inviteCache from "../../../src/cache/invite"
import { DEFAULT_TENANT_ID } from "../../../src/constants"
import * as redis from "../../../src/redis/init"

describe("invite cache", () => {
  afterEach(async () => {
    const inviteListClient = await redis.getInviteListClient()
    await inviteListClient.clear()
  })

  it("stores invites in tenant list and retrieves", async () => {
    const code = await inviteCache.createCode("alpha@budibase.com", {
      tenantId: DEFAULT_TENANT_ID,
    })

    const invite = await inviteCache.getCode(code, DEFAULT_TENANT_ID)
    expect(invite.email).toBe("alpha@budibase.com")
    expect(invite.info.tenantId).toBe(DEFAULT_TENANT_ID)

    const invites = await inviteCache.getInviteCodes()
    expect(invites.some((inv) => inv.code === code)).toBe(true)
  })

  it("deletes list invites", async () => {
    const code = await inviteCache.createCode("delete@budibase.com", {
      tenantId: DEFAULT_TENANT_ID,
    })

    await inviteCache.deleteCode(code, DEFAULT_TENANT_ID)
    await expect(inviteCache.getCode(code, DEFAULT_TENANT_ID)).rejects.toBeDefined()

    const inviteListClient = await redis.getInviteListClient()
    const list = (await inviteListClient.get(DEFAULT_TENANT_ID)) as any
    expect(list).toBeDefined()
    expect(list.invites[code]).toBeUndefined()
  })

  it("matches existing invites regardless of email casing", async () => {
    await inviteCache.createCode("mixed.case@budibase.com", {
      tenantId: DEFAULT_TENANT_ID,
    })

    const invites = await inviteCache.getExistingInvites(["MIXED.CASE@BUDIBASE.COM"])

    expect(invites).toHaveLength(1)
    expect(invites[0].email).toBe("mixed.case@budibase.com")
  })
})
