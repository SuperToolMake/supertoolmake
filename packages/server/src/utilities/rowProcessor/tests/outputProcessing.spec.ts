import { generator, structures } from "@budibase/backend-core/tests"
import {
  BBReferenceFieldSubType,
  FieldType,
  INTERNAL_TABLE_SOURCE_ID,
  Table,
  TableSourceType,
} from "@budibase/types"
import { outputProcessing } from ".."

import TestConfiguration from "../../../tests/utilities/TestConfiguration"
import * as bbReferenceProcessor from "../bbReferenceProcessor"

jest.mock("../bbReferenceProcessor", (): typeof bbReferenceProcessor => ({
  processInputBBReference: jest.fn(),
  processInputBBReferences: jest.fn(),
  processOutputBBReference: jest.fn(),
  processOutputBBReferences: jest.fn(),
}))

describe("rowProcessor - outputProcessing", () => {
  const config = new TestConfiguration()

  beforeAll(async () => {
    await config.init()
  })

  afterAll(async () => {
    config.end()
  })

  beforeEach(() => {
    jest.resetAllMocks()
  })

  const processOutputBBReferenceMock =
    bbReferenceProcessor.processOutputBBReference as jest.Mock
  const processOutputBBReferencesMock =
    bbReferenceProcessor.processOutputBBReferences as jest.Mock

  it("fetches single user references given a populated field", async () => {
    await config.doInContext(config.getDevWorkspaceId(), async () => {
      const table: Table = {
        _id: generator.guid(),
        name: "TestTable",
        type: "table",
        sourceId: INTERNAL_TABLE_SOURCE_ID,
        sourceType: TableSourceType.INTERNAL,
        schema: {
          name: {
            type: FieldType.STRING,
            name: "name",
            constraints: {
              presence: true,
              type: "string",
            },
          },
          user: {
            type: FieldType.BB_REFERENCE_SINGLE,
            subtype: BBReferenceFieldSubType.USER,
            name: "user",
            constraints: {
              presence: false,
              type: "string",
            },
          },
        },
      }

      const row = {
        name: "Jack",
        user: "123",
      }

      const user = structures.users.user()
      processOutputBBReferenceMock.mockResolvedValue(user)

      const result = await outputProcessing(table, row, { squash: false })

      expect(result).toEqual({ name: "Jack", user })

      expect(
        bbReferenceProcessor.processOutputBBReference
      ).toHaveBeenCalledTimes(1)
      expect(
        bbReferenceProcessor.processOutputBBReference
      ).toHaveBeenCalledWith("123", BBReferenceFieldSubType.USER)
    })
  })

  it("fetches users references given a populated field", async () => {
    await config.doInContext(config.getDevWorkspaceId(), async () => {
      const table: Table = {
        _id: generator.guid(),
        name: "TestTable",
        type: "table",
        sourceId: INTERNAL_TABLE_SOURCE_ID,
        sourceType: TableSourceType.INTERNAL,
        schema: {
          name: {
            type: FieldType.STRING,
            name: "name",
            constraints: {
              presence: true,
              type: "string",
            },
          },
          users: {
            type: FieldType.BB_REFERENCE,
            subtype: BBReferenceFieldSubType.USER,
            name: "users",
            constraints: {
              presence: false,
              type: "string",
            },
          },
        },
      }

      const row = {
        name: "Jack",
        users: "123",
      }

      const users = [structures.users.user()]
      processOutputBBReferencesMock.mockResolvedValue(users)

      const result = await outputProcessing(table, row, { squash: false })

      expect(result).toEqual({ name: "Jack", users })

      expect(
        bbReferenceProcessor.processOutputBBReferences
      ).toHaveBeenCalledTimes(1)
      expect(
        bbReferenceProcessor.processOutputBBReferences
      ).toHaveBeenCalledWith("123", BBReferenceFieldSubType.USER)
    })
  })

  it("process output even when the field is not empty", async () => {
    await config.doInContext(config.getDevWorkspaceId(), async () => {
      const table: Table = {
        _id: generator.guid(),
        name: "TestTable",
        type: "table",
        sourceId: INTERNAL_TABLE_SOURCE_ID,
        sourceType: TableSourceType.INTERNAL,
        schema: {
          name: {
            type: FieldType.STRING,
            name: "name",
            constraints: {
              presence: true,
              type: "string",
            },
          },
          user: {
            type: FieldType.BB_REFERENCE,
            subtype: BBReferenceFieldSubType.USER,
            name: "user",
            constraints: {
              presence: false,
              type: "string",
            },
          },
        },
      }

      const row = {
        name: "Jack",
      }

      const result = await outputProcessing(table, row, { squash: false })

      expect(result).toEqual({ name: "Jack" })

      expect(
        bbReferenceProcessor.processOutputBBReferences
      ).toHaveBeenCalledTimes(1)
    })
  })

  it("does not fetch bb references when not in the schema", async () => {
    await config.doInContext(config.getDevWorkspaceId(), async () => {
      const table: Table = {
        _id: generator.guid(),
        name: "TestTable",
        type: "table",
        sourceId: INTERNAL_TABLE_SOURCE_ID,
        sourceType: TableSourceType.INTERNAL,
        schema: {
          name: {
            type: FieldType.STRING,
            name: "name",
            constraints: {
              presence: true,
              type: "string",
            },
          },
          user: {
            type: FieldType.NUMBER,
            name: "user",
            constraints: {
              presence: false,
              type: "string",
            },
          },
        },
      }

      const row = {
        name: "Jack",
        user: "123",
      }

      const result = await outputProcessing(table, row, { squash: false })

      expect(result).toEqual({ name: "Jack", user: "123" })

      expect(
        bbReferenceProcessor.processOutputBBReferences
      ).not.toHaveBeenCalled()
    })
  })
})
