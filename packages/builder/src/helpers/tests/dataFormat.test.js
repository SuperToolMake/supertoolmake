import { describe, expect, it } from "vitest"
import { sortAndFormat } from "../data/format"

describe("sortAndFormat.tables", () => {
  it("includes the datasource ID on table entries", () => {
    const tables = [
      {
        _id: "users",
        name: "Users",
        sourceId: "postgres",
      },
    ]
    const datasources = [
      {
        _id: "postgres",
        name: "Postgres",
      },
    ]

    expect(sortAndFormat.tables(tables, datasources)).toEqual([
      {
        label: "Users",
        tableId: "users",
        type: "table",
        datasourceId: "postgres",
        datasourceName: "Postgres",
        resourceId: "users",
      },
    ])
  })
})
