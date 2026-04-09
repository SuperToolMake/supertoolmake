import type { FieldType, SearchFilter } from "@supertoolmake/types"

export interface UICondition {
  column: string
  type: FieldType
  referenceValue: unknown
  operator: SearchFilter["operator"]
  metadataKey: string
  metadataValue: string
  target: string
  // Button-specific condition fields
  buttonIndex?: number
  newValue?: unknown
  action?: string
  setting?: string
  settingValue?: unknown
}
