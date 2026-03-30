import { context, utils } from "@budibase/backend-core"
import { INTERNAL_TABLE_SOURCE_ID, type Table, TableSourceType } from "@budibase/types"
import * as setup from "./utilities"

describe("/rowActions", () => {
  const config = setup.getConfig()

  let tableId: string

  beforeAll(async () => {
    await config.init()
  })

  beforeEach(async () => {
    tableId = `ta_${utils.newid()}`
    await config.doInContext(config.getDevWorkspaceId(), async () => {
      const db = context.getWorkspaceDB()
      const table: Table = {
        _id: tableId,
        name: `Table_${utils.newid()}`,
        type: "table",
        sourceType: TableSourceType.INTERNAL,
        sourceId: INTERNAL_TABLE_SOURCE_ID,
        schema: {},
      }
      await db.put(table)
    })
  })

  afterAll(setup.afterAll)

  it("returns empty actions for a table with no row actions", async () => {
    const response = await config.api.rowAction.find(tableId)
    expect(response).toEqual({
      actions: {},
    })
  })

  it("rejects duplicate row action names for the same table", async () => {
    await config.api.rowAction.save(tableId, {
      name: "Duplicate me",
    })

    await config.api.rowAction.save(
      tableId,
      {
        name: "duplicate me",
      },
      {
        status: 409,
        body: {
          message: "A row action with the same name already exists.",
        },
      }
    )
  })

  it("deletes row actions", async () => {
    const created = await config.api.rowAction.save(tableId, {
      name: "Delete me",
    })

    await config.api.rowAction.delete(tableId, created.id, {
      status: 204,
    })

    const fetched = await config.api.rowAction.find(tableId)
    expect(fetched).toEqual({
      actions: {},
    })
  })
})
