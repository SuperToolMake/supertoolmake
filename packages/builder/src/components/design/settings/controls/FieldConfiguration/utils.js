import { FieldType } from "@supertoolmake/types"

export const convertOldFieldFormat = (fields) => {
  if (!fields) {
    return []
  }
  const converted = fields.map((field) => {
    if (typeof field === "string") {
      // existed but was a string
      return {
        field,
        active: true,
      }
    } else if (typeof field?.active != "boolean") {
      // existed but had no state
      return {
        field: field.name,
        active: true,
      }
    } else {
      return field
    }
  })
  return converted
}

export const getComponentForField = (field, schema) => {
  if (!(field && schema?.[field])) {
    return null
  }
  const type = schema[field].type
  return FieldTypeToComponentMap[type]
}

export const FieldTypeToComponentMap = {
  [FieldType.STRING]: "stringfield",
  [FieldType.NUMBER]: "numberfield",
  [FieldType.BIGINT]: "bigintfield",
  [FieldType.OPTIONS]: "optionsfield",
  [FieldType.ARRAY]: "multifieldselect",
  [FieldType.BOOLEAN]: "booleanfield",
  [FieldType.LONGFORM]: "longformfield",
  [FieldType.DATETIME]: "datetimefield",
  [FieldType.LINK]: "relationshipfield",
  [FieldType.JSON]: "jsonfield",
  [FieldType.BB_REFERENCE]: "bbreferencefield",
  [FieldType.BB_REFERENCE_SINGLE]: "bbreferencesinglefield",
}
