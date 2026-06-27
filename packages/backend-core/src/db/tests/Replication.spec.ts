import { DocumentType, InternalTable, SEPARATOR } from "@supertoolmake/types"
import { structures } from "../../../tests"
import { getPouchDB, init as initPouch } from "../couch"
import Replication from "../Replication"

const USER_METADATA_PREFIX = `${DocumentType.ROW}${SEPARATOR}${InternalTable.USER_METADATA}${SEPARATOR}`

beforeAll(() => {
  initPouch()
})

const makeDoc = (id: string, extra: Record<string, any> = {}) => ({
  _id: id,
  _rev: "1-abc",
  ...extra,
})

describe("Replication", () => {
  describe("constructor", () => {
    it("sets direction to TO_PRODUCTION when source is workspace dev and target is workspace", () => {
      const source = `${DocumentType.WORKSPACE_DEV}_test`
      const target = `${DocumentType.WORKSPACE}_test`
      const rep = new Replication({ source, target })
      expect(rep.direction).toBe("toProduction")
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

  describe("appReplicateOpts", () => {
    let rep: Replication

    beforeEach(() => {
      const source = `${DocumentType.WORKSPACE_DEV}_test`
      const target = `${DocumentType.WORKSPACE}_test`
      rep = new Replication({ source, target })
    })

    it("returns opts as-is if filter is a string", () => {
      const opts = { filter: "my_design/my_filter" }
      const result = rep.appReplicateOpts(opts)
      expect(result).toEqual(opts)
    })

    it("removes isCreation and tablesToSync from returned opts", () => {
      const result = rep.appReplicateOpts({
        isCreation: true,
        tablesToSync: ["ta_table1"],
      })
      expect(result.isCreation).toBeUndefined()
      expect(result.tablesToSync).toBeUndefined()
    })

    describe("filter function", () => {
      const getFilter = (direction: "toProduction" | "toDev") => {
        const source =
          direction === "toDev"
            ? `${DocumentType.WORKSPACE}_test`
            : `${DocumentType.WORKSPACE_DEV}_test`
        const target =
          direction === "toDev"
            ? `${DocumentType.WORKSPACE_DEV}_test`
            : `${DocumentType.WORKSPACE}_test`
        const r = new Replication({ source, target })
        return r.appReplicateOpts({})
      }

      const filterDoc = (
        direction: "toProduction" | "toDev",
        doc: any,
        extra: Record<string, any> = {}
      ) => {
        const opts = getFilter(direction)
        return (opts.filter as Function)(doc, extra)
      }

      it("excludes design/migrations document when not creating", () => {
        const doc = makeDoc("_design/migrations")
        expect(filterDoc("toProduction", doc, { isCreation: false })).toBe(false)
      })

      it("includes design/migrations document when creating", () => {
        const doc = makeDoc("_design/migrations")
        const opts = rep.appReplicateOpts({ isCreation: true })
        const filter = opts.filter as Function
        expect(filter(doc, {})).toBe(true)
      })

      it("excludes all design documents when replicating to dev", () => {
        const doc = makeDoc("_design/some_view")
        expect(filterDoc("toDev", doc)).toBe(false)
      })

      it("includes design documents when replicating to production", () => {
        const doc = makeDoc("_design/some_view")
        expect(filterDoc("toProduction", doc)).toBe(true)
      })

      it("includes deleted documents", () => {
        const doc = makeDoc(`${DocumentType.ROW}_abc`, { _deleted: true })
        expect(filterDoc("toProduction", doc)).toBe(true)
        expect(filterDoc("toDev", doc)).toBe(true)
      })

      it("includes user metadata documents", () => {
        const doc = makeDoc(`${USER_METADATA_PREFIX}_user123`)
        expect(filterDoc("toProduction", doc)).toBe(true)
        expect(filterDoc("toDev", doc)).toBe(true)
      })

      it("excludes automation log documents", () => {
        const doc = makeDoc(`${DocumentType.AUTOMATION_LOG}_abc`)
        expect(filterDoc("toProduction", doc)).toBe(false)
        expect(filterDoc("toDev", doc)).toBe(false)
      })

      it("excludes workspace metadata document", () => {
        const doc = makeDoc(DocumentType.WORKSPACE_METADATA)
        expect(filterDoc("toProduction", doc)).toBe(false)
        expect(filterDoc("toDev", doc)).toBe(false)
      })

      it("excludes auto column state when not creating and replicating to production", () => {
        const doc = makeDoc(`${DocumentType.AUTO_COLUMN_STATE}_abc`)
        expect(filterDoc("toProduction", doc)).toBe(false)
      })

      it("includes auto column state when creating and replicating to production", () => {
        const doc = makeDoc(`${DocumentType.AUTO_COLUMN_STATE}_abc`)
        const opts = rep.appReplicateOpts({ isCreation: true })
        const filter = opts.filter as Function
        expect(filter(doc, {})).toBe(true)
      })

      it("includes auto column state when replicating to dev", () => {
        const doc = makeDoc(`${DocumentType.AUTO_COLUMN_STATE}_abc`)
        expect(filterDoc("toDev", doc)).toBe(true)
      })

      describe("data documents (rows and links)", () => {
        it("includes row documents when replicating all tables", () => {
          const doc = makeDoc(`${DocumentType.ROW}_ta_table1_abc`)
          const opts = rep.appReplicateOpts({ tablesToSync: "all" })
          const filter = opts.filter as Function
          expect(filter(doc, {})).toBe(true)
        })

        it("includes link documents when replicating all tables", () => {
          const doc = makeDoc(`${DocumentType.LINK}_ta_table1_abc`)
          const opts = rep.appReplicateOpts({ tablesToSync: "all" })
          const filter = opts.filter as Function
          expect(filter(doc, {})).toBe(true)
        })

        it("excludes data documents when no tables specified", () => {
          const doc = makeDoc(`${DocumentType.ROW}_ta_table1_abc`)
          const opts = rep.appReplicateOpts({})
          const filter = opts.filter as Function
          expect(filter(doc, {})).toBe(false)
        })

        it("excludes data documents when tablesToSync does not match", () => {
          const doc = makeDoc(`${DocumentType.ROW}_ta_table1_abc`)
          const opts = rep.appReplicateOpts({ tablesToSync: ["ta_table2"] })
          const filter = opts.filter as Function
          expect(filter(doc, {})).toBe(false)
        })

        it("includes data documents when tablesToSync matches", () => {
          const doc = makeDoc(`${DocumentType.ROW}_ta_table1_abc`)
          const opts = rep.appReplicateOpts({ tablesToSync: ["ta_table1"] })
          const filter = opts.filter as Function
          expect(filter(doc, {})).toBe(true)
        })
      })

      describe("non-data documents", () => {
        it("includes app metadata documents", () => {
          const doc = makeDoc(`${DocumentType.WORKSPACE}_test`)
          expect(filterDoc("toProduction", doc)).toBe(true)
        })

        it("includes role documents", () => {
          const doc = makeDoc(`${DocumentType.ROLE}_admin`)
          expect(filterDoc("toProduction", doc)).toBe(true)
        })

        it("includes datasource documents", () => {
          const doc = makeDoc(`${DocumentType.DATASOURCE}_abc`)
          expect(filterDoc("toProduction", doc)).toBe(true)
        })

        it("includes screen documents", () => {
          const doc = makeDoc(`${DocumentType.SCREEN}_abc`)
          expect(filterDoc("toProduction", doc)).toBe(true)
        })

        it("includes layout documents", () => {
          const doc = makeDoc(`${DocumentType.LAYOUT}_abc`)
          expect(filterDoc("toProduction", doc)).toBe(true)
        })
      })

      it("delegates to custom filter when one is provided", () => {
        const customFilter = jest.fn().mockReturnValue(true)
        const doc = makeDoc(`${DocumentType.ROLE}_admin`)
        const opts = rep.appReplicateOpts({ filter: customFilter })
        const filter = opts.filter as Function
        const result = filter(doc, { query: {} })
        expect(result).toBe(true)
        expect(customFilter).toHaveBeenCalledWith(doc, { query: {} })
      })

      it("custom filter can reject documents", () => {
        const customFilter = jest.fn().mockReturnValue(false)
        const doc = makeDoc(`${DocumentType.ROLE}_admin`)
        const opts = rep.appReplicateOpts({ filter: customFilter })
        const filter = opts.filter as Function
        expect(filter(doc, {})).toBe(false)
      })

      it("passes through non-data docs to custom filter", () => {
        const customFilter = jest.fn().mockReturnValue(true)
        const doc = makeDoc(`${DocumentType.ROLE}_admin`)
        const opts = rep.appReplicateOpts({ filter: customFilter })
        const filter = opts.filter as Function
        filter(doc, {})
        expect(customFilter).toHaveBeenCalled()
      })

      it("does not pass data docs to custom filter when tablesToSync is set", () => {
        const customFilter = jest.fn().mockReturnValue(true)
        const doc = makeDoc(`${DocumentType.ROW}_ta_table1_abc`)
        const opts = rep.appReplicateOpts({
          filter: customFilter,
          tablesToSync: "all",
        })
        const filter = opts.filter as Function
        const result = filter(doc, {})
        expect(result).toBe(true)
        expect(customFilter).not.toHaveBeenCalled()
      })
    })
  })

  describe("replicate", () => {
    it("replicates documents from source to target", async () => {
      const source = structures.db.id()
      const target = structures.db.id()
      const sourceDB = getPouchDB(source)
      const targetDB = getPouchDB(target)

      try {
        await sourceDB.put({
          _id: `${DocumentType.ROLE}_admin`,
          name: "admin",
        })

        const rep = new Replication({ source, target })
        const result = await rep.replicate()

        expect(result.ok).toBe(true)
        expect(result.docs_written).toBeGreaterThan(0)

        const doc = await targetDB.get(`${DocumentType.ROLE}_admin`)
        expect(doc.name).toBe("admin")
      } finally {
        await sourceDB.destroy()
        await targetDB.destroy()
      }
    })

    it("replicates multiple documents", async () => {
      const source = structures.db.id()
      const target = structures.db.id()
      const sourceDB = getPouchDB(source)
      const targetDB = getPouchDB(target)

      try {
        await sourceDB.bulkDocs([
          { _id: `${DocumentType.ROLE}_admin`, name: "admin" },
          { _id: `${DocumentType.ROLE}_user`, name: "user" },
          { _id: `${DocumentType.DATASOURCE}_ds1`, type: "postgres" },
        ])

        const rep = new Replication({ source, target })
        const result = await rep.replicate()

        expect(result.ok).toBe(true)
        expect(result.docs_written).toBeGreaterThanOrEqual(3)

        const adminDoc = await targetDB.get(`${DocumentType.ROLE}_admin`)
        expect(adminDoc.name).toBe("admin")
        const userDoc = await targetDB.get(`${DocumentType.ROLE}_user`)
        expect(userDoc.name).toBe("user")
        const dsDoc = await targetDB.get(`${DocumentType.DATASOURCE}_ds1`)
        expect(dsDoc.type).toBe("postgres")
      } finally {
        await sourceDB.destroy()
        await targetDB.destroy()
      }
    })

    it("replicates with filter options", async () => {
      const source = structures.db.id()
      const target = structures.db.id()
      const sourceDB = getPouchDB(source)
      const targetDB = getPouchDB(target)

      try {
        await sourceDB.bulkDocs([
          { _id: `${DocumentType.ROLE}_admin`, name: "admin" },
          { _id: `${DocumentType.ROLE}_user`, name: "user" },
        ])

        const rep = new Replication({ source, target })
        const opts = {
          filter: (doc: any) => doc._id.includes("admin"),
        }
        await rep.replicate(opts)

        const adminDoc = await targetDB.get(`${DocumentType.ROLE}_admin`)
        expect(adminDoc.name).toBe("admin")

        try {
          await targetDB.get(`${DocumentType.ROLE}_user`)
          fail("Expected doc not found")
        } catch (err: any) {
          expect(err.status).toBe(404)
        }
      } finally {
        await sourceDB.destroy()
        await targetDB.destroy()
      }
    })
  })

  describe("rollback", () => {
    it("restores target to source state", async () => {
      const source = structures.db.id()
      const target = structures.db.id()
      const sourceDB = getPouchDB(source)
      const targetDB = getPouchDB(target)

      try {
        await sourceDB.put({
          _id: `${DocumentType.ROLE}_admin`,
          name: "admin",
        })

        const rep = new Replication({ source, target })
        await rep.replicate()

        const beforeDoc = await targetDB.get(`${DocumentType.ROLE}_admin`)
        expect(beforeDoc.name).toBe("admin")

        await targetDB.put({
          _id: `${DocumentType.ROLE}_admin`,
          name: "modified",
          _rev: beforeDoc._rev,
        })

        const modifiedDoc = await targetDB.get(`${DocumentType.ROLE}_admin`)
        expect(modifiedDoc.name).toBe("modified")

        await rep.rollback()

        const afterDoc = await targetDB.get(`${DocumentType.ROLE}_admin`)
        expect(afterDoc.name).toBe("admin")
      } finally {
        await sourceDB.destroy()
        await targetDB.destroy()
      }
    })

    it("removes extra documents from target", async () => {
      const source = structures.db.id()
      const target = structures.db.id()
      const sourceDB = getPouchDB(source)
      const targetDB = getPouchDB(target)

      try {
        await sourceDB.put({
          _id: `${DocumentType.ROLE}_admin`,
          name: "admin",
        })

        const rep = new Replication({ source, target })
        await rep.replicate()

        await targetDB.put({
          _id: `${DocumentType.ROLE}_extra`,
          name: "extra",
        })

        const extraDoc = await targetDB.get(`${DocumentType.ROLE}_extra`)
        expect(extraDoc.name).toBe("extra")

        await rep.rollback()

        try {
          await targetDB.get(`${DocumentType.ROLE}_extra`)
          fail("Expected doc not found")
        } catch (err: any) {
          expect(err.status).toBe(404)
        }
      } finally {
        await sourceDB.destroy()
        await targetDB.destroy()
      }
    })
  })

  describe("close", () => {
    it("closes both source and target databases", async () => {
      const source = structures.db.id()
      const target = structures.db.id()
      const rep = new Replication({ source, target })
      await expect(rep.close()).resolves.not.toThrow()
    })
  })
})
