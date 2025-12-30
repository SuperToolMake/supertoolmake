import { constants, context, db as dbCore } from "@budibase/backend-core"
import { structures } from "@budibase/backend-core/tests"
import {
  FieldType,
  FormulaType,
  PublishResourceState,
  Row,
  Table,
  WorkspaceApp,
} from "@budibase/types"
import { cloneDeep } from "lodash/fp"
import { getRowParams } from "../../../db/utils"
import { basicTable } from "../../../tests/utilities/structures"
import * as setup from "./utilities"

describe("/api/deploy", () => {
  let config = setup.getConfig()

  afterAll(() => {
    setup.afterAll()
  })

  beforeAll(async () => {
    await config.init()
  })

  beforeEach(async () => {
    await config.newTenant()
  })

  describe("GET /api/deploy/status", () => {
    it("returns empty state when unpublished", async () => {
      await config.api.workspace.unpublish(config.devWorkspaceId!)
      const res = await config.api.deploy.publishStatus()
      // default screens will appear here
      for (const workspaceApp of Object.values(res.workspaceApps)) {
        expect(workspaceApp.published).toBe(false)
      }
    })

    it("returns disabled state for development-only resources", async () => {
      // Create workspace app
      const { workspaceApp } = await config.api.workspaceApp.create(
        structures.workspaceApps.createRequest({
          name: "Test Workspace App",
          url: "/testapp",
        })
      )

      const res = await config.api.deploy.publishStatus()
      expect(res.workspaceApps[workspaceApp._id!]).toEqual({
        published: false,
        name: workspaceApp.name,
        unpublishedChanges: true,
        state: "disabled",
      })
    })

    it("returns published state after full publish", async () => {
      const table = await config.api.table.save(basicTable())
      const { workspaceApp } = await config.api.workspaceApp.create(
        structures.workspaceApps.createRequest({
          name: "Test Workspace App",
          url: "/testapp",
        })
      )

      await config.api.workspace.publish(config.devWorkspace!.appId)

      const res = await config.api.deploy.publishStatus()

      expect(res.workspaceApps[workspaceApp._id!]).toEqual({
        publishedAt: expect.any(String),
        published: true,
        name: workspaceApp.name,
        unpublishedChanges: false,
        state: "published",
      })
      expect(res.tables[table._id!]).toEqual({
        publishedAt: expect.any(String),
        published: true,
        name: table.name,
        unpublishedChanges: false,
        state: "published",
      })
    })
  })

  describe("POST /api/deploy", () => {
    beforeAll(async () => {
      await config.init()
    })

    beforeEach(async () => {
      await config.unpublish()
    })

    function expectApp(workspace: WorkspaceApp) {
      return {
        disabled: async (
          disabled: boolean | undefined,
          state: PublishResourceState
        ) => {
          expect(
            (await config.api.workspaceApp.find(workspace._id!)).disabled
          ).toBe(disabled)

          const status = await config.api.deploy.publishStatus()
          expect(status.workspaceApps[workspace._id!]).toEqual(
            expect.objectContaining({
              state,
            })
          )
        },
      }
    }

    async function publishProdApp() {
      await config.api.workspace.publish(config.getDevWorkspaceId())
      await config.api.workspace.sync(config.getDevWorkspaceId())
    }

    it("should define the disable value for all workspace apps when publishing for the first time", async () => {
      const { workspaceApp: publishedApp } =
        await config.api.workspaceApp.create({
          name: "Test App 1",
          url: "/app1",
          disabled: false,
        })
      const { workspaceApp: appWithoutInfo } =
        await config.api.workspaceApp.create({
          name: "Test App 2",
          url: "/app2",
        })
      const { workspaceApp: disabledApp } =
        await config.api.workspaceApp.create(
          structures.workspaceApps.createRequest({
            name: "Disabled App",
            url: "/disabled",
            disabled: true,
          })
        )

      expect(publishedApp.disabled).toBe(false)
      expect(appWithoutInfo.disabled).toBeUndefined()
      expect(disabledApp.disabled).toBe(true)

      // Publish the app for the first time
      await publishProdApp()

      await expectApp(publishedApp).disabled(
        false,
        PublishResourceState.PUBLISHED
      )
      await expectApp(appWithoutInfo).disabled(
        true,
        PublishResourceState.DISABLED
      )
      await expectApp(disabledApp).disabled(true, PublishResourceState.DISABLED)
    })

    it("should not disable workspace apps on subsequent publishes", async () => {
      const { workspaceApp: initialApp } = await config.api.workspaceApp.create(
        {
          name: "Test App 1",
          url: "/app1",
          disabled: undefined,
        }
      )
      await publishProdApp()

      // Remove disabled flag, simulating old apps
      const db = dbCore.getDB(config.getDevWorkspaceId())
      await db.put({
        ...(await config.api.workspaceApp.find(initialApp._id)),
        disabled: undefined,
      })

      const { workspaceApp: secondApp } = await config.api.workspaceApp.create({
        name: "Test App 2",
        url: "/app2",
        disabled: true,
      })
      await publishProdApp()

      await expectApp(initialApp).disabled(
        undefined,
        PublishResourceState.PUBLISHED
      )
      await expectApp(secondApp).disabled(true, PublishResourceState.DISABLED)
    })
  })

  it("updates production rows with new static formulas when published", async () => {
    const amountFieldName = "amount"
    const tableDefinition = basicTable(undefined, {
      schema: {
        [amountFieldName]: {
          name: amountFieldName,
          type: FieldType.NUMBER,
          constraints: {},
        },
      },
    })

    const table = await config.api.table.save(tableDefinition)

    // Initial publish so a production workspace exists
    await config.api.workspace.publish(config.devWorkspace!.appId)

    // Create a row directly in production to simulate live data
    const productionRow = await config.withHeaders(
      { [constants.Header.APP_ID]: config.getProdWorkspaceId() },
      async () =>
        await config.api.row.save(table._id!, {
          tableId: table._id!,
          name: "Prod row",
          description: "Prod description",
          [amountFieldName]: 5,
        })
    )

    const formulaFieldName = "amountPlusOne"
    const formula = "{{ add amount 1 }}"

    const updatedTable = cloneDeep(table)
    updatedTable.schema[formulaFieldName] = {
      name: formulaFieldName,
      type: FieldType.FORMULA,
      formula,
      formulaType: FormulaType.STATIC,
      responseType: FieldType.NUMBER,
    }

    await config.api.table.save(updatedTable)

    await config.api.workspace.publish(config.devWorkspace!.appId)

    const prodRowAfterPublish = await config.withHeaders(
      { [constants.Header.APP_ID]: config.getProdWorkspaceId() },
      async () => await config.api.row.get(table._id!, productionRow._id!)
    )

    expect(prodRowAfterPublish[formulaFieldName]).toBe(6)
  })

  it("migrates production row data when a column is renamed in development", async () => {
    const table = await config.api.table.save(basicTable())
    await config.api.row.save(table._id!, {
      name: "Test Row",
      description: "original value",
    })

    await config.api.workspace.publish(config.devWorkspace!.appId)

    const renamedSchema = {
      ...table.schema,
      details: {
        ...table.schema.description,
        name: "details",
      },
    }

    // casting to any here because TS can't infer the description property properly.
    delete (renamedSchema as any).description

    const renamedTable = await config.api.table.save({
      ...table,
      schema: renamedSchema,
      _rename: { old: "description", updated: "details" },
    })

    const devRows = await config.api.row.search(renamedTable._id!, {
      query: {},
    })
    expect(devRows.rows[0].details).toBe("original value")

    await config.api.workspace.publish(config.devWorkspace!.appId)

    await config.withProdApp(async () => {
      const prodRows = await config.api.row.search(renamedTable._id!, {
        query: {},
      })

      expect(prodRows.rows[0].details).toBe("original value")
      expect(prodRows.rows[0].description).toBeUndefined()
    })
  })

  it("applies pending renames even when the replicated schema is stale", async () => {
    const table = await config.api.table.save(basicTable())
    await config.api.row.save(table._id!, {
      name: "Test Row",
      description: "original value",
    })

    await config.api.workspace.publish(config.devWorkspace!.appId)

    const rename = { old: "description", updated: "details" }
    const renamedSchema = {
      ...table.schema,
      details: {
        ...table.schema.description,
        name: "details",
      },
    }
    delete (renamedSchema as any).description

    const renamedTable = await config.api.table.save({
      ...table,
      schema: renamedSchema,
      _rename: rename,
    })

    // Simulating that we got a stale schema that still uses the old column.
    await config.doInContext(config.getDevWorkspaceId(), async () => {
      const db = context.getWorkspaceDB()
      const tableDoc = await db.tryGet<Table>(renamedTable._id!)
      if (tableDoc) {
        tableDoc.schema = {
          ...tableDoc.schema,
          description: { ...table.schema.description, name: "description" },
        }
        delete tableDoc.schema.details
        await db.put(tableDoc)
      }

      const rows = (
        await db.allDocs<Row>(
          getRowParams(renamedTable._id!, null, { include_docs: true })
        )
      ).rows.map(row => row.doc!)

      await db.bulkDocs(
        rows.map(row => {
          const updated: Row = {
            ...row,
            description: row.details || row.description,
          }
          delete updated.details
          return updated
        })
      )
    })

    await config.api.workspace.publish(config.devWorkspace!.appId)

    await config.withProdApp(async () => {
      const prodRows = await config.api.row.search(renamedTable._id!, {
        query: {},
      })

      expect(prodRows.rows[0].details).toBe("original value")
      expect(prodRows.rows[0].description).toBeUndefined()

      const prodTable = await config.api.table.get(renamedTable._id!)
      expect(prodTable.pendingColumnRenames || []).toHaveLength(0)
      expect(prodTable.schema.details).toBeDefined()
    })
  })

  it("keeps dev revisions aligned with prod after column renames to avoid rev gaps", async () => {
    const table = await config.api.table.save(basicTable())
    await config.api.workspace.publish(config.devWorkspace!.appId)

    const renamedSchema = {
      ...table.schema,
      details: {
        ...table.schema.description,
        name: "details",
      },
    }
    delete (renamedSchema as any).description

    const renamedTable = await config.api.table.save({
      ...table,
      schema: renamedSchema,
      _rename: { old: "description", updated: "details" },
    })

    // First publish after rename
    await config.api.workspace.publish(config.devWorkspace!.appId)
    // Second publish should not see prod ahead of dev
    await config.api.workspace.publish(config.devWorkspace!.appId)

    let prodRevNum: number | undefined
    await config.withProdApp(async () => {
      const prodTable = await config.api.table.get(renamedTable._id!)
      expect(prodTable._deleted).toBeFalsy()
      prodRevNum = parseInt(prodTable._rev!.split("-")[0])
    })

    await config.doInContext(config.getDevWorkspaceId(), async () => {
      const db = context.getWorkspaceDB()
      const devTable = await db.get<Table>(renamedTable._id!)
      const devRevNum = parseInt(devTable._rev!.split("-")[0])
      expect(devRevNum).toBeGreaterThanOrEqual(prodRevNum!)
    })
  })

  it("keeps dev revisions aligned when multiple pending renames would bump prod multiple times", async () => {
    const table = await config.api.table.save(basicTable())
    await config.api.workspace.publish(config.devWorkspace!.appId)

    // First rename
    const renamedOnce = await config.api.table.save({
      ...table,
      schema: {
        ...table.schema,
        details: { ...table.schema.description, name: "details" },
      },
      _rename: { old: "description", updated: "details" },
    })

    // Second rename on the already renamed table
    const renamedTwice = await config.api.table.save({
      ...renamedOnce,
      schema: {
        ...renamedOnce.schema,
        fullName: { ...renamedOnce.schema.name, name: "fullName" },
      },
      _rename: { old: "name", updated: "fullName" },
    })

    await config.api.workspace.publish(config.devWorkspace!.appId)
    await config.api.workspace.publish(config.devWorkspace!.appId)

    let prodRevNum: number | undefined
    await config.withProdApp(async () => {
      const prodTable = await config.api.table.get(renamedTwice._id!)
      expect(prodTable._deleted).toBeFalsy()
      prodRevNum = parseInt(prodTable._rev!.split("-")[0])
    })

    await config.doInContext(config.getDevWorkspaceId(), async () => {
      const db = context.getWorkspaceDB()
      const devTable = await db.get<Table>(renamedTwice._id!)
      const devRevNum = parseInt(devTable._rev!.split("-")[0])
      expect(devRevNum).toBeGreaterThanOrEqual(prodRevNum!)
    })
  })
})
