import { BodyType } from "@supertoolmake/types"
import { enrichContext } from "./queries"

jest.mock("../../utils", () => ({
  getEnvironmentVariables: jest.fn(() => ({})),
}))

describe("queries SDK", () => {
  describe("enrichContext", () => {
    it.each(["delete", "row", "rows"])("escapes JSON parameters in %s", async (field) => {
      const injected = 'value","extra":"injected'
      const result = await enrichContext(
        { [field]: '{"value":"{{ value }}"}' },
        { value: injected }
      )
      expect(result[field]).toEqual({ value: injected })
    })

    it.each([
      ["false", false],
      ["0", 0],
      ["null", null],
    ])("keeps JSON primitive request bodies: %s", async (template, expected) => {
      const result = await enrichContext({ requestBody: template })

      expect(result.json).toBe(expected)
    })

    it("keeps JSON primitive custom data and removes the customData field", async () => {
      const result = await enrichContext({ customData: "false" })

      expect(result).toEqual({ json: false })
    })

    it.each([
      "requestBody",
      "json",
      "customData",
    ])("preserves null properties in literal JSON in %s", async (field) => {
      const body = {
        phone: null,
        nested: { deletedAt: null },
        items: [null, { value: null }],
        active: false,
        count: 0,
        label: "",
      }
      const result = await enrichContext({
        [field]: JSON.stringify(body),
      })

      expect(result.json).toStrictEqual(body)
    })

    it.each([
      "requestBody",
      "json",
      "customData",
    ])("preserves null properties in a JSON string bound to %s", async (field) => {
      const payload = {
        phone: null,
        nested: { deletedAt: null },
        items: [null, { value: null }],
      }
      const result = await enrichContext(
        { [field]: "{{ payload }}" },
        { payload: JSON.stringify(payload) }
      )

      expect(result.json).toStrictEqual(payload)
    })

    it("preserves null values and dynamic keys in JSON objects while omitting undefined properties", async () => {
      const result = await enrichContext(
        {
          json: {
            "{{ fieldName }}": null,
            nested: { value: null, omitted: undefined },
            omitted: undefined,
          },
        },
        { fieldName: "phone" }
      )

      expect(result).toStrictEqual({
        json: { phone: null, nested: { value: null } },
      })
    })

    it("still omits null configuration fields and headers", async () => {
      const result = await enrichContext({
        json: null,
        customData: null,
        requestBody: undefined,
        headers: { "X-Optional": null, "X-Keep": "value" },
      })

      expect(result).toStrictEqual({ headers: { "X-Keep": "value" } })
    })

    it("preserves null request properties in JSON bodies", async () => {
      const body = { phone: null, active: false }
      const objectResult = await enrichContext({
        bodyType: BodyType.JSON,
        requestBody: body,
      })
      const literalResult = await enrichContext({
        bodyType: BodyType.JSON,
        requestBody: JSON.stringify(body),
      })

      expect(objectResult.requestBody).toStrictEqual(body)
      expect(literalResult.requestBody).toStrictEqual(body)
    })

    it.each([
      "delete",
      "row",
      "rows",
    ])("preserves nested null properties in the %s JSON field", async (field) => {
      const body = { phone: null, nested: { deletedAt: null } }
      const result = await enrichContext({ [field]: JSON.stringify(body) })

      expect(result[field]).toStrictEqual(body)
    })

    it("enriches object keys recursively", async () => {
      const result = await enrichContext(
        {
          json: {
            "{{ fieldName }}": "value",
            nested: {
              "{{ nestedFieldName }}": "{{ nestedValue }}",
            },
          },
        },
        {
          fieldName: "dynamicField",
          nestedFieldName: "dynamicNestedField",
          nestedValue: "nested field value",
        }
      )

      expect(result).toEqual({
        json: {
          dynamicField: "value",
          nested: {
            dynamicNestedField: "nested field value",
          },
        },
      })
    })

    it("enriches parsed JSON template keys", async () => {
      const result = await enrichContext(
        {
          json: `{
            "{{ fieldName }}": 9,
            "nested": {
              "{{ nestedFieldName }}": "{{ nestedValue }}"
            }
          }`,
        },
        {
          fieldName: "accommodates",
          nestedFieldName: "label",
          nestedValue: "Apartment",
        }
      )

      expect(result).toEqual({
        json: {
          accommodates: 9,
          nested: {
            label: "Apartment",
          },
        },
      })
    })

    it("falls back to requestBody when json is blank", async () => {
      const result = await enrichContext({
        json: "",
        requestBody: { ok: true },
      })

      expect(result).toEqual({
        json: { ok: true },
        requestBody: { ok: true },
      })
    })

    it("prefers json over customData and requestBody", async () => {
      const result = await enrichContext({
        json: { source: "json" },
        customData: { source: "customData" },
        requestBody: { source: "requestBody" },
      })

      expect(result).toEqual({
        json: { source: "json" },
        requestBody: { source: "requestBody" },
      })
    })

    it.each([
      ["false", false],
      ["0", 0],
      ["null", null],
    ])("prefers falsy json values: %s", async (template, expected) => {
      const result = await enrichContext({
        json: template,
        requestBody: { ok: true },
      })

      expect(result).toEqual({
        json: expected,
        requestBody: { ok: true },
      })
    })
  })
})
