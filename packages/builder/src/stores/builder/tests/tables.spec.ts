import { FieldType, RelationshipType, type Table, TableSourceType } from "@supertoolmake/types"
import { get } from "svelte/store"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { API } from "@/api"
import { TableStore } from "../tables"

vi.mock("@/api", () => ({
  API: {
    getTables: vi.fn(),
    getTable: vi.fn(),
    saveTable: vi.fn(),
    deleteTable: vi.fn(),
  },
}))

const source: Table = {
  _id: "ta_source",
  _rev: "1-source",
  type: "table",
  name: "Source",
  sourceId: "bb_internal",
  sourceType: TableSourceType.INTERNAL,
  schema: {
    target: {
      name: "target",
      type: FieldType.LINK,
      tableId: "ta_target",
      fieldName: "sources",
      relationshipType: RelationshipType.MANY_TO_ONE,
    },
  },
}

const target: Table = {
  ...source,
  _id: "ta_target",
  name: "Target",
  schema: {},
}

const savedSource: Table = { ...source, schema: {} }

describe("table relationship cleanup", () => {
  let store: TableStore

  beforeEach(() => {
    vi.resetAllMocks()
    store = new TableStore()
    store.set({ list: [source, target], selectedTableId: source._id })
    vi.mocked(API.saveTable).mockResolvedValue(savedSource)
  })

  it("removes stale related tables without failing a successful column deletion", async () => {
    vi.mocked(API.getTable).mockRejectedValue({ status: 404 })

    await store.deleteField({ name: "target" })

    expect(get(store).list).toEqual([savedSource])
    expect(get(store).selected).toEqual(savedSource)
  })

  it("propagates failures other than a missing related table", async () => {
    const error = { status: 500, message: "Database unavailable" }
    vi.mocked(API.getTable).mockRejectedValue(error)

    await expect(store.deleteField({ name: "target" })).rejects.toEqual(error)
  })

  it("refreshes relationship schemas after deleting a table", async () => {
    vi.mocked(API.getTables).mockResolvedValue([savedSource])

    await store.delete({ _id: target._id!, _rev: target._rev! })

    expect(get(store).list).toEqual([savedSource])
    expect(get(store).selected).toEqual(savedSource)
  })
})
