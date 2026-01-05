import { Document } from "../document"
import { FieldSchema } from "./table"

export const EXTERNAL_ROW_REV = "rev"

export enum FieldType {
  STRING = "string",
  LONGFORM = "longform",
  OPTIONS = "options",
  NUMBER = "number",
  BOOLEAN = "boolean",
  ARRAY = "array",
  DATETIME = "datetime",
  LINK = "link",
  AUTO = "auto",
  JSON = "json",
  BARCODEQR = "barcodeqr",
  BIGINT = "bigint",
  BB_REFERENCE = "bb_reference",
  BB_REFERENCE_SINGLE = "bb_reference_single",
}

export const JsonTypes = [
  // only BB_REFERENCE is JSON, it's an array, BB_REFERENCE_SINGLE is a string type
  FieldType.BB_REFERENCE,
  FieldType.JSON,
  FieldType.ARRAY,
]

export const NumericTypes = [FieldType.NUMBER, FieldType.BIGINT]

export function isNumeric(type: FieldType) {
  return NumericTypes.includes(type)
}

export const GroupByTypes = [
  FieldType.STRING,
  FieldType.LONGFORM,
  FieldType.OPTIONS,
  FieldType.NUMBER,
  FieldType.BOOLEAN,
  FieldType.DATETIME,
  FieldType.BIGINT,
]

export function canGroupBy(type: FieldType) {
  return GroupByTypes.includes(type)
}

export function canGroupBySchema(schema: FieldSchema) {
  return canGroupBy(schema.type)
}

export interface Row extends Document {
  type?: string
  tableId?: string
  _viewId?: string
  [key: string]: any
}
