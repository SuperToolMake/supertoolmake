import { Readable, Writable } from "node:stream"
import tk from "timekeeper"
import { generator, structures } from "../../../../tests"
import { CouchDatabase } from ".."

const initialTime = new Date()
tk.freeze(initialTime)

describe("DatabaseImpl", () => {
  const db = new CouchDatabase(structures.db.id())

  beforeEach(() => {
    tk.freeze(initialTime)
  })

  describe("put", () => {
    it("persists createdAt and updatedAt fields", async () => {
      const id = generator.guid()
      await db.put({ _id: id })

      expect(await db.get(id)).toEqual({
        _id: id,
        _rev: expect.any(String),
        createdAt: initialTime.toISOString(),
        updatedAt: initialTime.toISOString(),
      })
    })

    it("updates updated at fields", async () => {
      const id = generator.guid()

      await db.put({ _id: id })
      tk.travel(100)

      await db.put({ ...(await db.get(id)), newValue: 123 })

      expect(await db.get(id)).toEqual({
        _id: id,
        _rev: expect.any(String),
        newValue: 123,
        createdAt: initialTime.toISOString(),
        updatedAt: new Date().toISOString(),
      })
    })

    describe("returnDoc option", () => {
      it("returns standard response when returnDoc is not provided", async () => {
        const id = generator.guid()
        const response = await db.put({ _id: id })

        expect(response).toEqual({
          id,
          rev: expect.any(String),
          ok: true,
        })
        expect(response).not.toHaveProperty("doc")
      })

      it("returns standard response when returnDoc is false", async () => {
        const id = generator.guid()
        const response = await db.put({ _id: id }, { returnDoc: false })

        expect(response).toEqual({
          id,
          rev: expect.any(String),
          ok: true,
        })
        expect(response).not.toHaveProperty("doc")
      })

      it("returns document with updated _rev when returnDoc is true", async () => {
        const id = generator.guid()
        const originalDoc = { _id: id, value: "test" }
        const response = await db.put(originalDoc, { returnDoc: true })

        expect(response).toEqual({
          id,
          rev: expect.any(String),
          ok: true,
          doc: {
            _id: id,
            _rev: response.rev,
            value: "test",
            createdAt: initialTime.toISOString(),
            updatedAt: initialTime.toISOString(),
          },
        })
      })

      it("includes all document fields in returned doc", async () => {
        const id = generator.guid()
        const originalDoc = {
          _id: id,
          name: "test",
          count: 42,
          nested: { value: "nested" },
        }
        const response = await db.put(originalDoc, { returnDoc: true })

        expect(response.doc).toEqual({
          _id: id,
          _rev: response.rev,
          name: "test",
          count: 42,
          nested: { value: "nested" },
          createdAt: initialTime.toISOString(),
          updatedAt: initialTime.toISOString(),
        })
      })
    })
  })

  describe("bulkDocs", () => {
    it("persists createdAt and updatedAt fields", async () => {
      const ids = generator.unique(() => generator.guid(), 5)
      await db.bulkDocs(ids.map((id) => ({ _id: id })))

      for (const id of ids) {
        expect(await db.get(id)).toEqual({
          _id: id,
          _rev: expect.any(String),
          createdAt: initialTime.toISOString(),
          updatedAt: initialTime.toISOString(),
        })
      }
    })

    it("updates updated at fields", async () => {
      const ids = generator.unique(() => generator.guid(), 5)

      await db.bulkDocs(ids.map((id) => ({ _id: id })))
      tk.travel(100)

      const docsToUpdate = await Promise.all(
        ids.map(async (id) => ({ ...(await db.get(id)), newValue: 123 }))
      )
      await db.bulkDocs(docsToUpdate)

      for (const id of ids) {
        expect(await db.get(id)).toEqual({
          _id: id,
          _rev: expect.any(String),
          newValue: 123,
          createdAt: initialTime.toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
    })

    it("keeps existing createdAt", async () => {
      const ids = generator.unique(() => generator.guid(), 2)

      await db.bulkDocs(ids.map((id) => ({ _id: id })))
      tk.travel(100)

      const newDocs = generator.unique(() => generator.guid(), 3).map((id) => ({ _id: id }))
      const docsToUpdate = await Promise.all(
        ids.map(async (id) => ({ ...(await db.get(id)), newValue: 123 }))
      )
      await db.bulkDocs([...newDocs, ...docsToUpdate])

      for (const { _id } of docsToUpdate) {
        expect(await db.get(_id)).toEqual({
          _id,
          _rev: expect.any(String),
          newValue: 123,
          createdAt: initialTime.toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
      for (const { _id } of newDocs) {
        expect(await db.get(_id)).toEqual({
          _id,
          _rev: expect.any(String),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
    })
  })

  describe("dump", () => {
    async function collectDump(
      database: CouchDatabase,
      opts?: Parameters<CouchDatabase["dump"]>[1]
    ) {
      const chunks: string[] = []
      const stream = new Writable({
        write(chunk, _encoding, callback) {
          chunks.push(chunk.toString())
          callback()
        },
      })

      await database.dump(stream as any, opts)

      return chunks
        .join("")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    }

    it("dumps documents across multiple batches", async () => {
      const dumpDb = new CouchDatabase(structures.db.id())
      await dumpDb.bulkDocs([
        { _id: "dump_doc_1", value: 1 },
        { _id: "dump_doc_2", value: 2 },
        { _id: "dump_doc_3", value: 3 },
      ])

      const docs = await collectDump(dumpDb, { batch_size: 2 })

      expect(docs.map((doc) => doc._id)).toEqual(["dump_doc_1", "dump_doc_2", "dump_doc_3"])
    })

    it("applies filters while dumping across multiple batches", async () => {
      const dumpDb = new CouchDatabase(structures.db.id())
      await dumpDb.bulkDocs([
        { _id: "dump_filter_1", include: true },
        { _id: "dump_filter_2", include: false },
        { _id: "dump_filter_3", include: true },
      ])

      const docs = await collectDump(dumpDb, {
        batch_size: 2,
        filter: (doc: any) => doc.include,
      })

      expect(docs.map((doc) => doc._id)).toEqual(["dump_filter_1", "dump_filter_3"])
    })
  })

  describe("load", () => {
    it("loads JSON-lines document dumps", async () => {
      const loadDb = new CouchDatabase(structures.db.id())
      const stream = Readable.from(
        [
          JSON.stringify({ _id: "load_doc_1", _rev: "1-source", value: 1 }),
          JSON.stringify({ _id: "load_doc_2", _rev: "1-source", value: 2 }),
        ].join("\n")
      )

      await loadDb.load(stream as any)

      expect(await loadDb.get("load_doc_1")).toMatchObject({
        _id: "load_doc_1",
        _rev: expect.any(String),
        value: 1,
      })
      expect(await loadDb.get("load_doc_2")).toMatchObject({
        _id: "load_doc_2",
        _rev: expect.any(String),
        value: 2,
      })
    })

    it("loads PouchDB batch dumps", async () => {
      const loadDb = new CouchDatabase(structures.db.id())
      const stream = Readable.from(
        `${JSON.stringify({
          docs: [
            {
              _id: "load_pouch_doc_1",
              _rev: "1-967a00dff5e02add41819138abb3284d",
              value: 1,
              _revisions: {
                start: 1,
                ids: ["967a00dff5e02add41819138abb3284d"],
              },
            },
          ],
        })}\n`
      )

      await loadDb.load(stream as any)

      expect(await loadDb.get("load_pouch_doc_1")).toMatchObject({
        _id: "load_pouch_doc_1",
        value: 1,
      })
    })
  })
})
