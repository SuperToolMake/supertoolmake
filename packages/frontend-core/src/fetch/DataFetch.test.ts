import { FieldType, type TableSchema } from "@supertoolmake/types"
import { get } from "svelte/store"
import { describe, expect, it, vi } from "vitest"
import type { APIClient } from "../api/types"
import BaseDataFetch from "./DataFetch"

vi.mock("@supertoolmake/types", async () => import("../../../types/src"))
vi.mock("@supertoolmake/shared-core", async () => import("../../../shared-core/src"))
vi.mock("../utils", async () => ({
  QueryUtils: (await import("../../../shared-core/src")).dataFilters,
}))

const definition = { schema: { name: { name: "name", type: FieldType.STRING } } as TableSchema }

class TestFetch extends BaseDataFetch<{ type: "custom" }, typeof definition> {
  async getData() {
    return { rows: [{ name: "latest" }] }
  }
  async getDefinition() {
    return definition
  }
}

const createFetch = () =>
  new TestFetch({
    API: {} as APIClient,
    datasource: { type: "custom" },
    query: {},
  })

describe("overlapping data loads", () => {
  it("abandons an old definition that resolves after a newer load", async () => {
    const fetch = createFetch()
    vi.spyOn(fetch, "getData")
    vi.spyOn(fetch, "getDefinition")
    const staleDefinition = Promise.withResolvers<typeof definition>()
    vi.mocked(fetch.getDefinition).mockReturnValueOnce(staleDefinition.promise)
    const oldLoad = fetch.getInitialData()
    await fetch.getInitialData()
    staleDefinition.resolve({ schema: { stale: { name: "stale", type: FieldType.STRING } } })
    await oldLoad
    expect(get(fetch.store).rows).toEqual([{ name: "latest" }])
    expect(get(fetch.store).schema).toEqual(definition.schema)
    expect(fetch.getData).toHaveBeenCalledTimes(1)
  })

  it("keeps the latest rows when an older response arrives last", async () => {
    const fetch = createFetch()
    vi.spyOn(fetch, "getData")
    vi.spyOn(fetch, "getDefinition")
    const stalePage = Promise.withResolvers<{ rows: { name: string }[] }>()
    vi.mocked(fetch.getData).mockReturnValueOnce(stalePage.promise)
    const oldLoad = fetch.getInitialData()
    await vi.waitFor(() => expect(fetch.getData).toHaveBeenCalledTimes(1))
    await fetch.getInitialData()
    stalePage.resolve({ rows: [{ name: "stale" }] })
    await oldLoad
    expect(get(fetch.store).rows).toEqual([{ name: "latest" }])
  })
})
