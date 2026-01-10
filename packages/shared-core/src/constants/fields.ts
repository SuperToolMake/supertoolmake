import { FieldType } from "@budibase/types"

type SwitchableTypes = Partial<{
  [K in FieldType]: [K, ...FieldType[]]
}>

export const SWITCHABLE_TYPES: SwitchableTypes = {
  [FieldType.STRING]: [FieldType.STRING, FieldType.OPTIONS, FieldType.LONGFORM],
  [FieldType.OPTIONS]: [
    FieldType.OPTIONS,
    FieldType.STRING,
    FieldType.LONGFORM,
  ],
  [FieldType.LONGFORM]: [
    FieldType.LONGFORM,
    FieldType.STRING,
    FieldType.OPTIONS,
  ],
  [FieldType.NUMBER]: [FieldType.NUMBER, FieldType.BOOLEAN],
  [FieldType.JSON]: [FieldType.JSON, FieldType.ARRAY, FieldType.BB_REFERENCE],
}
