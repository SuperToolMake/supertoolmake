import {
  FieldType,
  RelationshipType,
  SearchFilters,
  Table,
} from "@budibase/types"
import { structures } from "../../../../api/routes/tests/utilities"
import TestConfiguration from "../../../../tests/utilities/TestConfiguration"
import {
  getDatasource,
  DatabaseName,
} from "../../../../integrations/tests/utils"
import { getQueryableFields, validateFilters } from "../queryUtils"

describe("query utils", () => {
  describe("validateFilters", () => {
    const fullFilters: SearchFilters = {
      equal: { one: "foo" },
      $or: {
        conditions: [
          {
            equal: { one: "foo2", two: "bar" },
            notEmpty: { one: null },
            $and: {
              conditions: [
                {
                  equal: { three: "baz" },
                  notEmpty: { forth: null },
                },
              ],
            },
          },
        ],
      },
      $and: {
        conditions: [{ equal: { one: "foo2" }, notEmpty: { one: null } }],
      },
    }

    it("does not throw on empty filters", () => {
      expect(() => validateFilters({}, [])).not.toThrow()
    })

    it("does not throw on valid fields", () => {
      expect(() =>
        validateFilters(fullFilters, ["one", "two", "three", "forth"])
      ).not.toThrow()
    })

    it("throws on invalid fields", () => {
      expect(() =>
        validateFilters(fullFilters, ["one", "three", "forth"])
      ).toThrow()
    })

    it("can handle numbered fields", () => {
      const prefixedFilters: SearchFilters = {
        equal: { "1:one": "foo" },
        $or: {
          conditions: [
            {
              equal: { "2:one": "foo2", "3:two": "bar" },
              notEmpty: { "4:one": null },
              $and: {
                conditions: [
                  {
                    equal: { "5:three": "baz", two: "bar2" },
                    notEmpty: { forth: null },
                  },
                ],
              },
            },
          ],
        },
        $and: {
          conditions: [{ equal: { "6:one": "foo2" }, notEmpty: { one: null } }],
        },
      }

      expect(() =>
        validateFilters(prefixedFilters, ["one", "two", "three", "forth"])
      ).not.toThrow()
    })

    it("can handle relationships", () => {
      const prefixedFilters: SearchFilters = {
        $or: {
          conditions: [
            { equal: { "1:other.one": "foo" } },
            {
              equal: {
                "2:other.one": "foo2",
                "3:other.two": "bar",
                "4:other.three": "baz",
              },
            },
            { equal: { "another.three": "baz2" } },
          ],
        },
      }

      expect(() =>
        validateFilters(prefixedFilters, [
          "other.one",
          "other.two",
          "other.three",
          "another.three",
        ])
      ).not.toThrow()
    })

    it("throws on invalid relationship fields", () => {
      const prefixedFilters: SearchFilters = {
        $or: {
          conditions: [
            { equal: { "1:other.one": "foo" } },
            {
              equal: {
                "2:other.one": "foo2",
                "3:other.two": "bar",
                "4:other.three": "baz",
              },
            },
            { equal: { "another.four": "baz2" } },
          ],
        },
      }

      expect(() =>
        validateFilters(prefixedFilters, [
          "other.one",
          "other.two",
          "other.three",
        ])
      ).toThrow()
    })
  })

  describe("getQueryableFields", () => {
    const config = new TestConfiguration()
    let datasource: any

    beforeAll(async () => {
      await config.init()
      process.env.DATASOURCE = "mariadb"
      const rawDatasource = await getDatasource(
        process.env.DATASOURCE as DatabaseName
      )
      datasource = await config.api.datasource.create(rawDatasource!)
    })

    it("returns table schema fields and _id", async () => {
      const table: Table = await config.api.table.save(
        structures.basicTable(datasource, {
          name: "TestTable_basic_fields",
          schema: {
            name: { name: "name", type: FieldType.STRING },
            age: { name: "age", type: FieldType.NUMBER },
          },
        })
      )

      const result = await getQueryableFields(table)
      expect(result).toEqual(["_id", "name", "description", "age", "id"])
    })

    it("excludes hidden fields", async () => {
      const table: Table = await config.api.table.save(
        structures.basicTable(datasource, {
          name: "TestTable_hidden_fields",
          schema: {
            name: { name: "name", type: FieldType.STRING },
            age: { name: "age", type: FieldType.NUMBER, visible: false },
          },
        })
      )

      const result = await getQueryableFields(table)
      expect(result).toEqual(["_id", "name", "description", "id"])
    })

    it("includes relationship fields", async () => {
      const aux: Table = await config.api.table.save(
        structures.basicTable(datasource, {
          name: "auxTable_relationship",
          schema: {
            title: { name: "title", type: FieldType.STRING },
            name: { name: "name", type: FieldType.STRING },
          },
        })
      )

      const table: Table = await config.api.table.save(
        structures.basicTable(datasource, {
          name: "TestTable_relationship",
          schema: {
            name: { name: "name", type: FieldType.STRING },
            aux: {
              name: "aux",
              type: FieldType.LINK,
              tableId: aux._id!,
              relationshipType: RelationshipType.ONE_TO_MANY,
              fieldName: "table",
            },
          },
        })
      )

      const result = await config.doInContext(config.devWorkspaceId, () => {
        return getQueryableFields(table)
      })
      expect(result).toEqual([
        "_id",
        "name",
        "description",
        "aux.name",
        "auxTable_relationship.name",
        "aux.description",
        "auxTable_relationship.description",
        "aux.title",
        "auxTable_relationship.title",
        "aux.id",
        "auxTable_relationship.id",
        "id",
        "fk_auxTable_relationship_table",
      ])
    })

    it("excludes hidden relationship fields", async () => {
      const aux: Table = await config.api.table.save(
        structures.basicTable(datasource, {
          name: "auxTable_hidden_rel",
          schema: {
            title: { name: "title", type: FieldType.STRING, visible: false },
            name: { name: "name", type: FieldType.STRING, visible: true },
          },
        })
      )

      const table: Table = await config.api.table.save(
        structures.basicTable(datasource, {
          name: "TestTable_hidden_rel",
          schema: {
            name: { name: "name", type: FieldType.STRING },
            aux: {
              name: "aux",
              type: FieldType.LINK,
              tableId: aux._id!,
              relationshipType: RelationshipType.ONE_TO_MANY,
              fieldName: "table",
            },
          },
        })
      )

      const result = await config.doInContext(config.devWorkspaceId, () => {
        return getQueryableFields(table)
      })
      expect(result).toEqual([
        "_id",
        "name",
        "description",
        "aux.name",
        "auxTable_hidden_rel.name",
        "aux.description",
        "auxTable_hidden_rel.description",
        "aux.id",
        "auxTable_hidden_rel.id",
        "id",
        "fk_auxTable_hidden_rel_table",
      ])
    })

    it("excludes all relationship fields if hidden", async () => {
      const aux: Table = await config.api.table.save(
        structures.basicTable(datasource, {
          name: "auxTable_hidden_all",
          schema: {
            title: { name: "title", type: FieldType.STRING, visible: false },
            name: { name: "name", type: FieldType.STRING, visible: true },
          },
        })
      )

      const table: Table = await config.api.table.save(
        structures.basicTable(datasource, {
          name: "TestTable_hidden_all",
          schema: {
            name: { name: "name", type: FieldType.STRING },
            aux: {
              name: "aux",
              type: FieldType.LINK,
              tableId: aux._id!,
              relationshipType: RelationshipType.ONE_TO_MANY,
              fieldName: "table",
              visible: false,
            },
          },
        })
      )

      const result = await config.doInContext(config.devWorkspaceId, () => {
        return getQueryableFields(table)
      })
      expect(result).toEqual([
        "_id",
        "name",
        "description",
        "id",
        "fk_auxTable_hidden_all_table",
      ])
    })

    describe("nested relationship", () => {
      describe("one-to-many", () => {
        let table: Table, aux1: Table, aux2: Table

        beforeAll(async () => {
          const { _id: aux1Id } = await config.api.table.save(
            structures.basicTable(datasource, {
              name: "aux1Table_one_to_many",
              schema: {
                name: { name: "name", type: FieldType.STRING },
              },
            })
          )
          const { _id: aux2Id } = await config.api.table.save(
            structures.basicTable(datasource, {
              name: "aux2Table_one_to_many",
              schema: {
                title: { name: "title", type: FieldType.STRING },
                aux1_1: {
                  name: "aux1_1",
                  type: FieldType.LINK,
                  tableId: aux1Id!,
                  relationshipType: RelationshipType.ONE_TO_MANY,
                  fieldName: "aux2_1",
                },
                aux1_2: {
                  name: "aux1_2",
                  type: FieldType.LINK,
                  tableId: aux1Id!,
                  relationshipType: RelationshipType.ONE_TO_MANY,
                  fieldName: "aux2_2",
                },
              },
            })
          )

          const { _id: tableId } = await config.api.table.save(
            structures.basicTable(datasource, {
              name: "TestTable_one_to_many",
              schema: {
                name: { name: "name", type: FieldType.STRING },
                aux1: {
                  name: "aux1",
                  type: FieldType.LINK,
                  tableId: aux1Id!,
                  relationshipType: RelationshipType.ONE_TO_MANY,
                  fieldName: "table",
                },
                aux2: {
                  name: "aux2",
                  type: FieldType.LINK,
                  tableId: aux2Id!,
                  relationshipType: RelationshipType.ONE_TO_MANY,
                  fieldName: "table",
                },
              },
            })
          )

          // We need to refech them to get the updated foreign keys
          aux1 = await config.api.table.get(aux1Id!)
          aux2 = await config.api.table.get(aux2Id!)
          table = await config.api.table.get(tableId!)
        })

        it("includes nested relationship fields from main table", async () => {
          const result = await config.doInContext(config.devWorkspaceId, () => {
            return getQueryableFields(table)
          })
          expect(result).toEqual([
            "_id",
            "name",
            "description",
            "aux1.name",
            "aux1Table_one_to_many.name",
            "aux1.description",
            "aux1Table_one_to_many.description",
            "aux1.id",
            "aux1Table_one_to_many.id",
            "aux2.name",
            "aux2Table_one_to_many.name",
            "aux2.description",
            "aux2Table_one_to_many.description",
            "aux2.title",
            "aux2Table_one_to_many.title",
            "aux2.id",
            "aux2Table_one_to_many.id",
            "aux2.fk_aux1Table_one_to_many_aux2_1",
            "aux2Table_one_to_many.fk_aux1Table_one_to_many_aux2_1",
            "aux2.fk_aux1Table_one_to_many_aux2_2",
            "aux2Table_one_to_many.fk_aux1Table_one_to_many_aux2_2",
            "id",
            "fk_aux1Table_one_to_many_table",
            "fk_aux2Table_one_to_many_table",
          ])
        })

        it("includes nested relationship fields from aux 1 table", async () => {
          const result = await config.doInContext(config.devWorkspaceId, () => {
            return getQueryableFields(aux1)
          })
          expect(result).toEqual([
            "_id",
            "name",
            "description",
            "id",
            "aux2_1.name",
            "aux2Table_one_to_many.name",
            "aux2_1.description",
            "aux2Table_one_to_many.description",
            "aux2_1.title",
            "aux2Table_one_to_many.title",
            "aux2_1.id",
            "aux2Table_one_to_many.id",
            "aux2_1.fk_aux1Table_one_to_many_aux2_1",
            "aux2Table_one_to_many.fk_aux1Table_one_to_many_aux2_1",
            "aux2_1.fk_aux1Table_one_to_many_aux2_2",
            "aux2Table_one_to_many.fk_aux1Table_one_to_many_aux2_2",
            "aux2_2.name",
            "aux2_2.description",
            "aux2_2.title",
            "aux2_2.id",
            "aux2_2.fk_aux1Table_one_to_many_aux2_1",
            "aux2_2.fk_aux1Table_one_to_many_aux2_2",
            "table.name",
            "TestTable_one_to_many.name",
            "table.description",
            "TestTable_one_to_many.description",
            "table.id",
            "TestTable_one_to_many.id",
            "table.fk_aux1Table_one_to_many_table",
            "TestTable_one_to_many.fk_aux1Table_one_to_many_table",
            "table.fk_aux2Table_one_to_many_table",
            "TestTable_one_to_many.fk_aux2Table_one_to_many_table",
          ])
        })

        it("includes nested relationship fields from aux 2 table", async () => {
          const result = await config.doInContext(config.devWorkspaceId, () => {
            return getQueryableFields(aux2)
          })
          expect(result).toEqual([
            "_id",
            "name",
            "description",
            "title",
            "aux1_1.name",
            "aux1Table_one_to_many.name",
            "aux1_1.description",
            "aux1Table_one_to_many.description",
            "aux1_1.id",
            "aux1Table_one_to_many.id",
            "aux1_2.name",
            "aux1_2.description",
            "aux1_2.id",
            "id",
            "fk_aux1Table_one_to_many_aux2_1",
            "fk_aux1Table_one_to_many_aux2_2",
            "table.name",
            "TestTable_one_to_many.name",
            "table.description",
            "TestTable_one_to_many.description",
            "table.id",
            "TestTable_one_to_many.id",
            "table.fk_aux1Table_one_to_many_table",
            "TestTable_one_to_many.fk_aux1Table_one_to_many_table",
            "table.fk_aux2Table_one_to_many_table",
            "TestTable_one_to_many.fk_aux2Table_one_to_many_table",
          ])
        })
      })

      describe("many-to-many", () => {
        let table: Table, aux: Table

        beforeAll(async () => {
          const { _id: auxId } = await config.api.table.save(
            structures.basicTable(datasource, {
              name: "amm",
              schema: {
                title: { name: "title", type: FieldType.STRING },
              },
            })
          )

          const { _id: tableId } = await config.api.table.save(
            structures.basicTable(datasource, {
              name: "tmm",
              schema: {
                name: { name: "name", type: FieldType.STRING },
                aux: {
                  name: "aux",
                  type: FieldType.LINK,
                  tableId: auxId!,
                  relationshipType: RelationshipType.MANY_TO_MANY,
                  fieldName: "table",
                },
              },
            })
          )

          // We need to refech them to get the updated foreign keys
          aux = await config.api.table.get(auxId!)
          table = await config.api.table.get(tableId!)
        })

        it("includes nested relationship fields from main table", async () => {
          const result = await config.doInContext(config.devWorkspaceId, () => {
            return getQueryableFields(table)
          })
          expect(result).toEqual([
            "_id",
            "name",
            "description",
            "aux.name",
            "amm.name",
            "aux.description",
            "amm.description",
            "aux.title",
            "amm.title",
            "aux.id",
            "amm.id",
            "id",
          ])
        })

        it("includes nested relationship fields from aux table", async () => {
          const result = await config.doInContext(config.devWorkspaceId, () => {
            return getQueryableFields(aux)
          })
          expect(result).toEqual([
            "_id",
            "name",
            "description",
            "title",
            "id",
            "table.name",
            "tmm.name",
            "table.description",
            "tmm.description",
            "table.id",
            "tmm.id",
          ])
        })
      })
    })
  })
})
