import { DocumentType } from "@supertoolmake/types"
import { structures } from "../../../tests"
import { getDB } from "../db"
import Replication from "../Replication"

const ensureDb = async (dbName: string) => {
  const db = getDB(dbName)
  const initId = `test_init_${structures.db.id()}`
  await db.put({ _id: initId, init: true })
  await db.remove(initId, (await db.get<any>(initId))._rev)
}

const makeDoc = (id: string, extra: Record<string, any> = {}) => ({
  _id: id,
  ...extra,
})

const getAllDocIds = async (dbName: string) => {
  const allDocs = await getDB(dbName).allDocs({ include_docs: false })
  return allDocs.rows.map((r: any) => r.id)
}

describe("Replication", () => {
  describe("constructor", () => {
    it("sets direction to TO_PRODUCTION when source is workspace dev and target is workspace", () => {
      const source = `${DocumentType.WORKSPACE_DEV}_test`
      const target = `${DocumentType.WORKSPACE}_test`
      const rep = new Replication({ source, target })
      expect(rep.direction).toBe("toProduction")
      expect(rep.sourceName).toBe(source)
      expect(rep.targetName).toBe(target)
    })

    it("sets direction to TO_DEV when source is workspace and target is workspace dev", () => {
      const source = `${DocumentType.WORKSPACE}_test`
      const target = `${DocumentType.WORKSPACE_DEV}_test`
      const rep = new Replication({ source, target })
      expect(rep.direction).toBe("toDev")
    })

    it("leaves direction undefined for non-workspace databases", () => {
      const source = structures.db.id()
      const target = structures.db.id()
      const rep = new Replication({ source, target })
      expect(rep.direction).toBeUndefined()
    })
  })

  describe("replicate", () => {
    it("replicates documents from source to target", async () => {
      const source = structures.db.id()
      const target = structures.db.id()
      await ensureDb(source)
      await ensureDb(target)

      await getDB(source).put(makeDoc(`${DocumentType.ROLE}_admin`, { name: "admin" }))

      const rep = new Replication({ source, target })
      await rep.replicate()

      const doc = await getDB(target).get(`${DocumentType.ROLE}_admin`)
      expect(doc).toMatchObject({ name: "admin" })
    }, 30000)

    it("replicates multiple documents", async () => {
      const source = structures.db.id()
      const target = structures.db.id()
      await ensureDb(source)
      await ensureDb(target)

      await getDB(source).bulkDocs([
        makeDoc(`${DocumentType.ROLE}_admin`, { name: "admin" }),
        makeDoc(`${DocumentType.ROLE}_user`, { name: "user" }),
        makeDoc(`${DocumentType.DATASOURCE}_ds1`, { type: "postgres" }),
      ])

      const rep = new Replication({ source, target })
      await rep.replicate()

      expect(await getDB(target).get(`${DocumentType.ROLE}_admin`)).toMatchObject({ name: "admin" })
      expect(await getDB(target).get(`${DocumentType.ROLE}_user`)).toMatchObject({ name: "user" })
      expect(await getDB(target).get(`${DocumentType.DATASOURCE}_ds1`)).toMatchObject({
        type: "postgres",
      })
    }, 30000)

    it("excludes automation log documents", async () => {
      const source = structures.db.id()
      const target = structures.db.id()
      await ensureDb(source)
      await ensureDb(target)

      await getDB(source).bulkDocs([
        makeDoc(`${DocumentType.AUTOMATION_LOG}_log1`, { data: "log" }),
        makeDoc(`${DocumentType.ROLE}_admin`, { name: "admin" }),
      ])

      const rep = new Replication({ source, target })
      await rep.replicate()

      const ids = await getAllDocIds(target)
      expect(ids).not.toContain(`${DocumentType.AUTOMATION_LOG}_log1`)
      expect(ids).toContain(`${DocumentType.ROLE}_admin`)
    }, 30000)

    it("does not replicate data documents by default (no tablesToSync)", async () => {
      const source = structures.db.id()
      const target = structures.db.id()
      await ensureDb(source)
      await ensureDb(target)

      await getDB(source).bulkDocs([
        makeDoc(`${DocumentType.ROW}_ta_table1_abc`, { value: 1 }),
        makeDoc(`${DocumentType.LINK}_ta_table1_def`, { link: true }),
        makeDoc(`${DocumentType.ROLE}_admin`, { name: "admin" }),
      ])

      const rep = new Replication({ source, target })
      await rep.replicate()

      const ids = await getAllDocIds(target)
      expect(ids).not.toContain(`${DocumentType.ROW}_ta_table1_abc`)
      expect(ids).not.toContain(`${DocumentType.LINK}_ta_table1_def`)
      expect(ids).toContain(`${DocumentType.ROLE}_admin`)
    }, 30000)

    it("replicates all rows and links when tablesToSync is 'all'", async () => {
      const source = structures.db.id()
      const target = structures.db.id()
      await ensureDb(source)
      await ensureDb(target)

      await getDB(source).bulkDocs([
        makeDoc(`${DocumentType.ROW}_ta_table1_abc`, { value: 1 }),
        makeDoc(`${DocumentType.LINK}_ta_table1_def`, { link: true }),
        makeDoc(`${DocumentType.ROW}_ta_table2_xyz`, { value: 2 }),
      ])

      const rep = new Replication({ source, target })
      await rep.replicate({ tablesToSync: "all" })

      const ids = await getAllDocIds(target)
      expect(ids).toContain(`${DocumentType.ROW}_ta_table1_abc`)
      expect(ids).toContain(`${DocumentType.LINK}_ta_table1_def`)
      expect(ids).toContain(`${DocumentType.ROW}_ta_table2_xyz`)
    }, 30000)

    it("replicates only matching rows when tablesToSync is a list", async () => {
      const source = structures.db.id()
      const target = structures.db.id()
      await ensureDb(source)
      await ensureDb(target)

      await getDB(source).bulkDocs([
        makeDoc(`${DocumentType.ROW}_ta_table1_abc`, { value: 1 }),
        makeDoc(`${DocumentType.ROW}_ta_table2_xyz`, { value: 2 }),
      ])

      const rep = new Replication({ source, target })
      await rep.replicate({ tablesToSync: ["ta_table1"] })

      const ids = await getAllDocIds(target)
      expect(ids).toContain(`${DocumentType.ROW}_ta_table1_abc`)
      expect(ids).not.toContain(`${DocumentType.ROW}_ta_table2_xyz`)
    }, 30000)

    it("replicates with custom filter", async () => {
      const source = structures.db.id()
      const target = structures.db.id()
      await ensureDb(source)
      await ensureDb(target)

      await getDB(source).bulkDocs([
        makeDoc(`${DocumentType.ROLE}_admin`, { name: "admin" }),
        makeDoc(`${DocumentType.ROLE}_user`, { name: "user" }),
      ])

      const rep = new Replication({ source, target })
      await rep.replicate({ filter: (doc: any) => doc._id.includes("admin") })

      const ids = await getAllDocIds(target)
      expect(ids).toContain(`${DocumentType.ROLE}_admin`)
      expect(ids).not.toContain(`${DocumentType.ROLE}_user`)
    }, 30000)

    it("does not remove existing target documents excluded by a custom filter", async () => {
      const source = structures.db.id()
      const target = structures.db.id()
      await ensureDb(source)
      await ensureDb(target)

      await getDB(source).bulkDocs([
        makeDoc(`${DocumentType.ROLE}_admin`, { name: "admin" }),
        makeDoc(`${DocumentType.ROLE}_user`, { name: "user" }),
      ])
      await getDB(target).bulkDocs([
        makeDoc(`${DocumentType.ROLE}_existing`, { name: "existing" }),
        makeDoc(`${DocumentType.DATASOURCE}_existing`, { type: "postgres" }),
      ])

      const rep = new Replication({ source, target })
      await rep.replicate({ filter: (doc: any) => doc._id.includes("admin") })

      const ids = await getAllDocIds(target)
      expect(ids).toContain(`${DocumentType.ROLE}_admin`)
      expect(ids).toContain(`${DocumentType.ROLE}_existing`)
      expect(ids).toContain(`${DocumentType.DATASOURCE}_existing`)
      expect(ids).not.toContain(`${DocumentType.ROLE}_user`)
    }, 30000)

    it("cleans up temporary replication filter design documents", async () => {
      const source = structures.db.id()
      const target = structures.db.id()
      await ensureDb(source)
      await ensureDb(target)

      await getDB(source).put(makeDoc(`${DocumentType.ROLE}_admin`, { name: "admin" }))

      const rep = new Replication({ source, target })
      await rep.replicate()

      const sourceIds = await getAllDocIds(source)
      const targetIds = await getAllDocIds(target)
      expect(sourceIds.some((id: string) => id.startsWith("_design/replication_"))).toBe(false)
      expect(targetIds.some((id: string) => id.startsWith("_design/replication_"))).toBe(false)
    }, 30000)

    it("excludes design documents when replicating to dev (TO_DEV)", async () => {
      const source = `${DocumentType.WORKSPACE}_${structures.db.id()}`
      const target = `${DocumentType.WORKSPACE_DEV}_${structures.db.id()}`
      await ensureDb(source)
      await ensureDb(target)

      await getDB(source).bulkDocs([
        makeDoc("_design/some_view", { views: {} }),
        makeDoc(`${DocumentType.ROLE}_admin`, { name: "admin" }),
      ])

      const rep = new Replication({ source, target })
      await rep.replicate()

      const ids = await getAllDocIds(target)
      expect(ids).not.toContain("_design/some_view")
      expect(ids).toContain(`${DocumentType.ROLE}_admin`)
    }, 30000)

    it("includes design documents when replicating to production (TO_PRODUCTION)", async () => {
      const source = `${DocumentType.WORKSPACE_DEV}_${structures.db.id()}`
      const target = `${DocumentType.WORKSPACE}_${structures.db.id()}`
      await ensureDb(source)
      await ensureDb(target)

      await getDB(source).bulkDocs([
        makeDoc("_design/some_view", { views: {} }),
        makeDoc(`${DocumentType.ROLE}_admin`, { name: "admin" }),
      ])

      const rep = new Replication({ source, target })
      await rep.replicate()

      const ids = await getAllDocIds(target)
      expect(ids).toContain("_design/some_view")
      expect(ids).toContain(`${DocumentType.ROLE}_admin`)
    }, 30000)

    it("excludes auto column state when replicating to production (TO_PRODUCTION, default)", async () => {
      const source = `${DocumentType.WORKSPACE_DEV}_${structures.db.id()}`
      const target = `${DocumentType.WORKSPACE}_${structures.db.id()}`
      await ensureDb(source)
      await ensureDb(target)

      await getDB(source).put(makeDoc(`${DocumentType.AUTO_COLUMN_STATE}_state1`, { active: true }))

      const rep = new Replication({ source, target })
      await rep.replicate()

      const ids = await getAllDocIds(target)
      expect(ids).not.toContain(`${DocumentType.AUTO_COLUMN_STATE}_state1`)
    }, 30000)

    it("replicates auto column state when isCreation is true (TO_PRODUCTION)", async () => {
      const source = `${DocumentType.WORKSPACE_DEV}_${structures.db.id()}`
      const target = `${DocumentType.WORKSPACE}_${structures.db.id()}`
      await ensureDb(source)
      await ensureDb(target)

      await getDB(source).put(makeDoc(`${DocumentType.AUTO_COLUMN_STATE}_state1`, { active: true }))

      const rep = new Replication({ source, target })
      await rep.replicate({ isCreation: true })

      const doc = await getDB(target).get(`${DocumentType.AUTO_COLUMN_STATE}_state1`)
      expect(doc).toMatchObject({ active: true })
    }, 30000)

    it("replicates user metadata documents", async () => {
      const source = `${DocumentType.WORKSPACE_DEV}_${structures.db.id()}`
      const target = `${DocumentType.WORKSPACE}_${structures.db.id()}`
      await ensureDb(source)
      await ensureDb(target)

      const userMetaId = `ro_ta_users_${structures.db.id()}`
      await getDB(source).put(makeDoc(userMetaId, { email: "test@example.com" }))

      const rep = new Replication({ source, target })
      await rep.replicate()

      const doc = await getDB(target).get(userMetaId)
      expect(doc).toMatchObject({ email: "test@example.com" })
    }, 30000)
  })

  describe("rollback", () => {
    it("restores target to source state", async () => {
      const source = structures.db.id()
      const target = structures.db.id()
      await ensureDb(source)
      await ensureDb(target)

      await getDB(source).put(makeDoc(`${DocumentType.ROLE}_admin`, { name: "admin" }))

      const rep = new Replication({ source, target })
      await rep.replicate()

      const beforeDoc = await getDB(target).get<any>(`${DocumentType.ROLE}_admin`)
      expect(beforeDoc.name).toBe("admin")

      await getDB(target).put({
        _id: `${DocumentType.ROLE}_admin`,
        _rev: beforeDoc._rev,
        name: "modified",
      })

      const modifiedDoc = await getDB(target).get<any>(`${DocumentType.ROLE}_admin`)
      expect(modifiedDoc.name).toBe("modified")

      await rep.rollback()

      const afterDoc = await getDB(target).get<any>(`${DocumentType.ROLE}_admin`)
      expect(afterDoc.name).toBe("admin")
    }, 60000)

    it("re-replicates all source documents after destroy", async () => {
      const source = structures.db.id()
      const target = structures.db.id()
      await ensureDb(source)
      await ensureDb(target)

      await getDB(source).bulkDocs([
        makeDoc(`${DocumentType.ROLE}_admin`, { name: "admin" }),
        makeDoc(`${DocumentType.ROLE}_user`, { name: "user" }),
      ])

      const rep = new Replication({ source, target })
      await rep.replicate()
      await rep.rollback()

      expect(await getDB(target).get(`${DocumentType.ROLE}_admin`)).toMatchObject({ name: "admin" })
      expect(await getDB(target).get(`${DocumentType.ROLE}_user`)).toMatchObject({ name: "user" })
    }, 60000)
  })
})
