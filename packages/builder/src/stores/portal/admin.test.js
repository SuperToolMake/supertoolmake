import { get, writable } from "svelte/store"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { API } from "@/api"
import { AdminStore } from "./admin"
import { auth } from "./auth"

vi.mock("./auth", () => {
  return { auth: vi.fn() }
})

// explict mock that is overwritten later so that the singleton admin store doesn't throw an error when partially mocked
vi.mock("svelte/store", () => {
  return {
    writable: vi.fn(() => ({
      subscribe: vi.fn(),
      update: vi.fn(),
    })),
    get: vi.fn(),
  }
})

vi.mock("@/api", () => {
  return {
    API: {
      getEnvironment: vi.fn(),
      getSystemStatus: vi.fn(),
      getChecklist: vi.fn(),
    },
  }
})

vi.mock("@supertoolmake/bbui", () => {
  return {
    banner: { showStatus: vi.fn() },
    Helpers: {
      uuid: vi.fn(),
    },
  }
})

describe("admin store", () => {
  beforeEach((ctx) => {
    vi.clearAllMocks()

    ctx.writableReturn = { update: vi.fn(), subscribe: vi.fn() }
    writable.mockReturnValue(ctx.writableReturn)

    ctx.returnedStore = new AdminStore()
  })

  describe("init method", () => {
    beforeEach(async (ctx) => {
      let getMockIndex = 0

      ctx.getMockValues = [{ tenantId: "tenantId" }]

      get.mockImplementation(() => {
        const value = ctx.getMockValues[getMockIndex]
        getMockIndex++

        return value
      })

      API.getChecklist.mockReturnValue("checklist")

      API.getEnvironment.mockReturnValue({
        isDev: true,
        serveDevClientFromStorage: false,
      })

      API.getSystemStatus.mockReturnValue("status")
    })

    describe("getCheckList", () => {
      beforeEach(async (ctx) => {
        await ctx.returnedStore.init()
      })

      it("adds the checklist to the store", (ctx) => {
        expect(get).toHaveBeenNthCalledWith(1, auth)
        expect(API.getChecklist).toHaveBeenCalledTimes(1)
        expect(API.getChecklist).toHaveBeenCalledWith("tenantId")
        expect(ctx.writableReturn.update.mock.calls[0][0]({ foo: "foo" })).toEqual({
          foo: "foo",
          checklist: "checklist",
        })
      })
    })

    describe("getEnvironment", () => {
      beforeEach(async (ctx) => {
        await ctx.returnedStore.init()
      })

      it("adds the environment to the store", (ctx) => {
        expect(API.getEnvironment).toHaveBeenCalledTimes(1)
        expect(API.getEnvironment).toHaveBeenCalledWith()
        expect(ctx.writableReturn.update.mock.calls[1][0]({ foo: "foo" })).toEqual({
          foo: "foo",
          isDev: true,
        })
      })
    })

    it("does not prefetch system status during initialization", async (ctx) => {
      await ctx.returnedStore.init()
      expect(API.getSystemStatus).not.toHaveBeenCalled()
    })

    describe("getEnvironment", () => {
      beforeEach(async (ctx) => {
        await ctx.returnedStore.init()
      })

      it("marks the store as loaded", (ctx) => {
        expect(ctx.writableReturn.update.mock.calls[2][0]({ foo: "foo" })).toEqual({
          foo: "foo",
          loaded: true,
        })
      })
    })
  })

  describe("unload", () => {
    beforeEach((ctx) => {
      ctx.returnedStore.unload()
    })

    it("sets the store's loaded parameter to false", (ctx) => {
      expect(ctx.writableReturn.update.mock.calls[0][0]({ loaded: true })).toEqual({
        loaded: false,
      })
    })
  })

  describe("getChecklist", () => {
    beforeEach(async (ctx) => {
      get.mockReturnValue({ tenantId: "tenantId" })
      API.getChecklist.mockReturnValue("checklist")
      await ctx.returnedStore.getChecklist()
    })

    it("updates the store with the new checklist", (ctx) => {
      expect(get).toHaveBeenNthCalledWith(1, auth)
      expect(API.getChecklist).toHaveBeenCalledTimes(1)
      expect(API.getChecklist).toHaveBeenCalledWith("tenantId")
      expect(ctx.writableReturn.update.mock.calls[0][0]({ foo: "foo" })).toEqual({
        foo: "foo",
        checklist: "checklist",
      })
    })
  })
})
