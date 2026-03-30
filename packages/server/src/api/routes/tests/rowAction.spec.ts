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

  it("creates and fetches row actions without automation metadata", async () => {
    const created = await config.api.rowAction.save(tableId, {
      name: "Do something",
    })

    expect(created).toEqual({
      id: expect.stringMatching(/^row_action_/),
      tableId,
      name: "Do something",
      allowedSources: [tableId],
    })
    expect(created).not.toHaveProperty("automationId")

    const fetched = await config.api.rowAction.find(tableId)
    expect(fetched).toEqual({
      actions: {
        [created.id]: {
          id: created.id,
          tableId,
          name: "Do something",
          allowedSources: [tableId],
        },
      },
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

  it("triggers a row action for an existing row", async () => {
    const created = await config.api.rowAction.save(tableId, {
      name: "Trigger me",
    })

    const response = await config.api.rowAction.trigger(
      tableId,
      created.id,
      {
        rowId: "ro_fake_row",
      },
      undefined,
      {
        useProdApp: false,
      }
    )

    expect(response).toEqual({
      message: "Row action triggered.",
    })
  })
})
