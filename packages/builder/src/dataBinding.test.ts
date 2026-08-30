import { JSONUtils } from "@supertoolmake/frontend-core"
import { describe, expect, it, vi } from "vitest"
import {
  getSchemaForDatasource,
  makeReadableKeyPropSafe,
  readableToRuntimeBinding,
  runtimeToReadableBinding,
  updateReferencesInObject,
} from "@/dataBinding"

interface MockStore<T> {
  subscribe: (run: (value: T) => void) => () => void
  set: (newValue: T) => void
  update: (updater: (value: T) => T) => void
  _value: () => T
}

function createMockStore<T>(initialValue: T): MockStore<T> {
  let value = initialValue
  return {
    subscribe: (run) => {
      run(value)
      return () => {}
    },
    set: (newValue) => {
      value = newValue
    },
    update: (updater) => {
      value = updater(value)
    },
    _value: () => value,
  }
}

function createBuilderStores() {
  const workspaceAppStore = {}
  const tables = createMockStore<{ list: unknown[] }>({ list: [] })
  const queries = createMockStore<{ list: unknown[] }>({ list: [] })
  const roles = createMockStore<{ list: unknown[] }>({ list: [] })
  const screenStore = createMockStore<{ screens: unknown[] }>({ screens: [] })
  const appStore = createMockStore<Record<string, unknown>>({})
  const layoutStore = createMockStore<Record<string, unknown>>({})
  const selectedScreen = createMockStore<unknown>(null)
  const componentStore = {
    getDefinition: (_component?: string) => null,
    getComponentSettings: (_component?: string) => [],
  }

  return {
    module: {
      workspaceAppStore,
      tables,
      queries,
      roles,
      screenStore,
      appStore,
      layoutStore,
      selectedScreen,
      componentStore,
    },
    tables,
    queries,
  }
}

vi.mock("@/stores/builder", () => createBuilderStores().module)

import { queries as queriesStore, tables as tablesStore } from "@/stores/builder"

const getTablesStore = () => tablesStore as unknown as MockStore<{ list: unknown[] }>
const getQueriesStore = () => queriesStore as unknown as MockStore<{ list: unknown[] }>

describe("Builder dataBinding", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("makeReadableKeyPropSafe", () => {
    it("wraps readable binding segments containing spaces", () => {
      expect(makeReadableKeyPropSafe("Query rows")).toBe("[Query rows]")
    })

    it("preserves readable binding segments without spaces", () => {
      expect(makeReadableKeyPropSafe("rows")).toBe("rows")
    })

    it("preserves already wrapped readable binding segments", () => {
      expect(makeReadableKeyPropSafe("[Query rows]")).toBe("[Query rows]")
    })
  })

  describe("runtimeToReadableBinding", () => {
    const bindableProperties = [
      {
        category: "Current User",
        icon: "user",
        providerId: "user",
        readableBinding: "Current User.firstName",
        runtimeBinding: "[user].[firstName]",
        type: "context",
      },
      {
        category: "Bindings",
        icon: "brackets-angle",
        readableBinding: "Binding.count",
        runtimeBinding: "count",
        type: "context",
      },
    ]
    it("should convert a runtime binding to a readable one", () => {
      const textWithBindings = `Hello {{ [user].[firstName] }}! The count is {{ count }}.`
      expect(runtimeToReadableBinding(bindableProperties, textWithBindings)).toEqual(
        `Hello {{ Current User.firstName }}! The count is {{ Binding.count }}.`
      )
    })

    it("should not convert to readable binding if it is already readable", () => {
      const textWithBindings = `Hello {{ [user].[firstName] }}! The count is {{ Binding.count }}.`
      expect(runtimeToReadableBinding(bindableProperties, textWithBindings)).toEqual(
        `Hello {{ Current User.firstName }}! The count is {{ Binding.count }}.`
      )
    })
  })

  describe("readableToRuntimeBinding", () => {
    const bindableProperties = [
      {
        category: "Current User",
        icon: "user",
        providerId: "user",
        readableBinding: "Current User.firstName",
        runtimeBinding: "[user].[firstName]",
        type: "context",
      },
      {
        category: "Bindings",
        icon: "brackets-angle",
        readableBinding: "Binding.count",
        runtimeBinding: "count",
        type: "context",
      },
      {
        category: "Bindings",
        icon: "brackets-angle",
        readableBinding: "location",
        runtimeBinding: "[location]",
        type: "context",
      },
      {
        category: "Bindings",
        icon: "brackets-angle",
        readableBinding: "foo.[bar]",
        runtimeBinding: "[foo].[qwe]",
        type: "context",
      },
      {
        category: "Bindings",
        icon: "brackets-angle",
        readableBinding: "foo.baz",
        runtimeBinding: "[foo].[baz]",
        type: "context",
      },
    ]
    it("should convert a readable binding to a runtime one", () => {
      const textWithBindings = `Hello {{ Current User.firstName }}! The count is {{ Binding.count }}.`
      expect(readableToRuntimeBinding(bindableProperties, textWithBindings)).toEqual(
        `Hello {{ [user].[firstName] }}! The count is {{ count }}.`
      )
    })
    it("should not convert a partial match", () => {
      const textWithBindings = `location {{ _location Zlocation location locationZ _location_ }}`
      expect(readableToRuntimeBinding(bindableProperties, textWithBindings)).toEqual(
        `location {{ _location Zlocation [location] locationZ _location_ }}`
      )
    })
    it("should handle special characters in the readable binding", () => {
      const textWithBindings = `{{ foo.baz }}`
      expect(readableToRuntimeBinding(bindableProperties, textWithBindings)).toEqual(
        `{{ [foo].[baz] }}`
      )
    })
  })

  describe("getSchemaForDatasource", () => {
    const tableId = "table_1"
    const fieldName = "jsonColumn"

    beforeEach(() => {
      getTablesStore().set({ list: [] })
      getQueriesStore().set({ list: [] })
    })

    it("uses json field schema when it contains a nested schema", () => {
      const tablesStore = getTablesStore()
      const jsonFieldSchema = {
        type: "json",
        schema: {
          first: { type: "string" },
          nested: {
            type: "json",
            schema: {
              deep: { type: "number" },
            },
          },
        },
      }

      tablesStore.set({
        list: [
          {
            _id: tableId,
            schema: {
              [fieldName]: jsonFieldSchema,
            },
          },
        ],
      })

      const jsonArraySpy = vi.spyOn(JSONUtils, "getJSONArrayDatasourceSchema")

      const datasource = {
        type: "jsonarray",
        tableId,
        fieldName,
        label: `${tableId}.${fieldName}`,
      }

      const { schema } = getSchemaForDatasource(null, datasource)

      expect(jsonArraySpy).not.toHaveBeenCalled()
      expect(schema.first).toMatchObject({ type: "string", name: "first" })
      expect(schema.nested).toMatchObject({ type: "json", name: "nested" })
      expect(schema["nested.deep"]).toMatchObject({
        type: "number",
        name: "nested.deep",
      })

      schema.first.type = "boolean"
      expect(jsonFieldSchema.schema.first.type).toBe("string")

      jsonArraySpy.mockRestore()
    })

    it("falls back to the JSON utility when no nested schema is provided", () => {
      const tablesStore = getTablesStore()
      const tableSchema = {
        [fieldName]: {
          type: "json",
        },
      }

      tablesStore.set({
        list: [
          {
            _id: tableId,
            schema: tableSchema,
          },
        ],
      })

      const jsonArraySpy = vi.spyOn(JSONUtils, "getJSONArrayDatasourceSchema").mockReturnValue({
        value: { type: "string", name: "value", prefixKeys: "" },
      })

      const datasource = {
        type: "jsonarray",
        tableId,
        fieldName,
        label: `${tableId}.${fieldName}`,
      }

      const { schema } = getSchemaForDatasource(null, datasource)

      expect(jsonArraySpy).toHaveBeenCalledWith(tableSchema, datasource)
      expect(schema.value).toMatchObject({ type: "string", name: "value" })
      expect(typeof schema.value.display?.type).toBe("string")

      jsonArraySpy.mockRestore()
    })
  })

  describe("updateReferencesInObject", () => {
    it("should increment steps in sequence on 'add'", () => {
      const obj = [
        {
          id: "a0",
          parameters: {
            text: "Alpha",
          },
        },
        {
          id: "a1",
          parameters: {
            text: "Apple",
          },
        },
        {
          id: "b2",
          parameters: {
            text: "Banana {{ actions.1.row }}",
          },
        },
        {
          id: "c3",
          parameters: {
            text: "Carrot {{ actions.1.row }}",
          },
        },
        {
          id: "d4",
          parameters: {
            text: "Dog {{ actions.3.row }}",
          },
        },
        {
          id: "e5",
          parameters: {
            text: "Eagle {{ actions.4.row }}",
          },
        },
      ]
      updateReferencesInObject({
        obj,
        modifiedIndex: 0,
        action: "add",
        label: "actions",
      })

      expect(obj).toEqual([
        {
          id: "a0",
          parameters: {
            text: "Alpha",
          },
        },
        {
          id: "a1",
          parameters: {
            text: "Apple",
          },
        },
        {
          id: "b2",
          parameters: {
            text: "Banana {{ actions.2.row }}",
          },
        },
        {
          id: "c3",
          parameters: {
            text: "Carrot {{ actions.2.row }}",
          },
        },
        {
          id: "d4",
          parameters: {
            text: "Dog {{ actions.4.row }}",
          },
        },
        {
          id: "e5",
          parameters: {
            text: "Eagle {{ actions.5.row }}",
          },
        },
      ])
    })

    it("should decrement steps in sequence on 'delete'", () => {
      const obj = [
        {
          id: "a1",
          parameters: {
            text: "Apple",
          },
        },
        {
          id: "b2",
          parameters: {
            text: "Banana {{ actions.1.row }}",
          },
        },
        {
          id: "d4",
          parameters: {
            text: "Dog {{ actions.3.row }}",
          },
        },
        {
          id: "e5",
          parameters: {
            text: "Eagle {{ actions.4.row }}",
          },
        },
      ]
      updateReferencesInObject({
        obj,
        modifiedIndex: 2,
        action: "delete",
        label: "actions",
      })

      expect(obj).toEqual([
        {
          id: "a1",
          parameters: {
            text: "Apple",
          },
        },
        {
          id: "b2",
          parameters: {
            text: "Banana {{ actions.1.row }}",
          },
        },
        {
          id: "d4",
          parameters: {
            text: "Dog {{ actions.2.row }}",
          },
        },
        {
          id: "e5",
          parameters: {
            text: "Eagle {{ actions.3.row }}",
          },
        },
      ])
    })

    it("should handle on 'move' to a lower index", () => {
      const obj = [
        {
          id: "a1",
          parameters: {
            text: "Apple",
          },
        },
        {
          id: "b2",
          parameters: {
            text: "Banana {{ actions.0.row }}",
          },
        },
        {
          id: "e5",
          parameters: {
            text: "Eagle {{ actions.3.row }}",
          },
        },
        {
          id: "c3",
          parameters: {
            text: "Carrot {{ actions.0.row }}",
          },
        },
        {
          id: "d4",
          parameters: {
            text: "Dog {{ actions.2.row }}",
          },
        },
      ]
      updateReferencesInObject({
        obj,
        modifiedIndex: 2,
        action: "move",
        label: "actions",
        originalIndex: 4,
      })

      expect(obj).toEqual([
        {
          id: "a1",
          parameters: {
            text: "Apple",
          },
        },
        {
          id: "b2",
          parameters: {
            text: "Banana {{ actions.0.row }}",
          },
        },
        {
          id: "e5",
          parameters: {
            text: "Eagle {{ actions.4.row }}",
          },
        },
        {
          id: "c3",
          parameters: {
            text: "Carrot {{ actions.0.row }}",
          },
        },
        {
          id: "d4",
          parameters: {
            text: "Dog {{ actions.3.row }}",
          },
        },
      ])
    })

    it("should not decrement references that sit before the moved action", () => {
      const obj = [
        {
          id: "queryAction",
          parameters: {
            text: "{{ actions.0.result }}",
          },
        },
        {
          id: "notification",
          parameters: {
            text: "{{ actions.0.result }}",
          },
        },
        {
          id: "prompt",
          parameters: {
            text: "Prompt",
          },
        },
      ]

      updateReferencesInObject({
        obj,
        modifiedIndex: 2,
        action: "move",
        label: "actions",
        originalIndex: 1,
      })

      expect(obj[1].parameters.text).toEqual("{{ actions.0.result }}")
    })

    it("should skip move updates when the original index is invalid", () => {
      const obj = [
        {
          id: "queryAction",
          parameters: {
            text: "{{ actions.0.result }}",
          },
        },
      ]

      updateReferencesInObject({
        obj,
        modifiedIndex: 0,
        action: "move",
        label: "actions",
        originalIndex: -1,
      })

      expect(obj[0].parameters.text).toEqual("{{ actions.0.result }}")
    })

    it("should handle on 'move' to a higher index", () => {
      const obj = [
        {
          id: "b2",
          parameters: {
            text: "Banana {{ actions.0.row }}",
          },
        },
        {
          id: "c3",
          parameters: {
            text: "Carrot {{ actions.0.row }}",
          },
        },
        {
          id: "a1",
          parameters: {
            text: "Apple",
          },
        },
        {
          id: "d4",
          parameters: {
            text: "Dog {{ actions.2.row }}",
          },
        },
        {
          id: "e5",
          parameters: {
            text: "Eagle {{ actions.3.row }}",
          },
        },
      ]
      updateReferencesInObject({
        obj,
        modifiedIndex: 2,
        action: "move",
        label: "actions",
        originalIndex: 0,
      })

      expect(obj).toEqual([
        {
          id: "b2",
          parameters: {
            text: "Banana {{ actions.2.row }}",
          },
        },
        {
          id: "c3",
          parameters: {
            text: "Carrot {{ actions.2.row }}",
          },
        },
        {
          id: "a1",
          parameters: {
            text: "Apple",
          },
        },
        {
          id: "d4",
          parameters: {
            text: "Dog {{ actions.1.row }}",
          },
        },
        {
          id: "e5",
          parameters: {
            text: "Eagle {{ actions.3.row }}",
          },
        },
      ])
    })

    it("should handle on 'move' of action being referenced, dragged to a higher index", () => {
      const obj = [
        {
          "##eventHandlerType": "Validate Form",
          id: "cCD0Dwcnq",
        },
        {
          "##eventHandlerType": "Close Screen Modal",
          id: "3fbbIOfN0H",
        },
        {
          "##eventHandlerType": "Save Row",
          parameters: {
            tableId: "ta_bb_employee",
          },
          id: "aehg5cTmhR",
        },
        {
          "##eventHandlerType": "Close Side Panel",
          id: "mzkpf86cxo",
        },
        {
          "##eventHandlerType": "Navigate To",
          id: "h0uDFeJa8A",
        },
        {
          parameters: {
            autoDismiss: true,
            type: "success",
            message: "{{ actions.1.row }}",
          },
          "##eventHandlerType": "Show Notification",
          id: "JEI5lAyJZ",
        },
      ]
      updateReferencesInObject({
        obj,
        modifiedIndex: 2,
        action: "move",
        label: "actions",
        originalIndex: 1,
      })

      expect(obj).toEqual([
        {
          "##eventHandlerType": "Validate Form",
          id: "cCD0Dwcnq",
        },
        {
          "##eventHandlerType": "Close Screen Modal",
          id: "3fbbIOfN0H",
        },
        {
          "##eventHandlerType": "Save Row",
          parameters: {
            tableId: "ta_bb_employee",
          },
          id: "aehg5cTmhR",
        },
        {
          "##eventHandlerType": "Close Side Panel",
          id: "mzkpf86cxo",
        },
        {
          "##eventHandlerType": "Navigate To",
          id: "h0uDFeJa8A",
        },
        {
          parameters: {
            autoDismiss: true,
            type: "success",
            message: "{{ actions.2.row }}",
          },
          "##eventHandlerType": "Show Notification",
          id: "JEI5lAyJZ",
        },
      ])
    })

    it("should handle on 'move' of action being referenced, dragged to a lower index", () => {
      const obj = [
        {
          "##eventHandlerType": "Save Row",
          parameters: {
            tableId: "ta_bb_employee",
          },
          id: "aehg5cTmhR",
        },
        {
          "##eventHandlerType": "Validate Form",
          id: "cCD0Dwcnq",
        },
        {
          "##eventHandlerType": "Close Screen Modal",
          id: "3fbbIOfN0H",
        },
        {
          "##eventHandlerType": "Close Side Panel",
          id: "mzkpf86cxo",
        },
        {
          "##eventHandlerType": "Navigate To",
          id: "h0uDFeJa8A",
        },
        {
          parameters: {
            autoDismiss: true,
            type: "success",
            message: "{{ actions.4.row }}",
          },
          "##eventHandlerType": "Show Notification",
          id: "JEI5lAyJZ",
        },
      ]
      updateReferencesInObject({
        obj,
        modifiedIndex: 0,
        action: "move",
        label: "actions",
        originalIndex: 4,
      })

      expect(obj).toEqual([
        {
          "##eventHandlerType": "Save Row",
          parameters: {
            tableId: "ta_bb_employee",
          },
          id: "aehg5cTmhR",
        },
        {
          "##eventHandlerType": "Validate Form",
          id: "cCD0Dwcnq",
        },
        {
          "##eventHandlerType": "Close Screen Modal",
          id: "3fbbIOfN0H",
        },
        {
          "##eventHandlerType": "Close Side Panel",
          id: "mzkpf86cxo",
        },
        {
          "##eventHandlerType": "Navigate To",
          id: "h0uDFeJa8A",
        },
        {
          parameters: {
            autoDismiss: true,
            type: "success",
            message: "{{ actions.0.row }}",
          },
          "##eventHandlerType": "Show Notification",
          id: "JEI5lAyJZ",
        },
      ])
    })
  })
})
