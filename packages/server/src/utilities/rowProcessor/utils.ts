import {
  AutoColumnFieldMetadata,
  AutoFieldSubType,
  FieldSchema,
  FieldType,
  Row,
  Table,
} from "@budibase/types"
import { AutoFieldDefaultNames } from "../../constants"

/**
 * If the subtype has been lost for any reason this works out what
 * subtype the auto column should be.
 */
export function fixAutoColumnSubType(
  column: FieldSchema
): AutoColumnFieldMetadata | FieldSchema {
  if (!column.autocolumn || !column.name || column.subtype) {
    return column
  }
  // the columns which get auto generated
  if (column.name.endsWith(AutoFieldDefaultNames.CREATED_BY)) {
    column.subtype = AutoFieldSubType.CREATED_BY
  } else if (column.name.endsWith(AutoFieldDefaultNames.UPDATED_BY)) {
    column.subtype = AutoFieldSubType.UPDATED_BY
  } else if (column.name.endsWith(AutoFieldDefaultNames.CREATED_AT)) {
    column.subtype = AutoFieldSubType.CREATED_AT
  } else if (column.name.endsWith(AutoFieldDefaultNames.UPDATED_AT)) {
    column.subtype = AutoFieldSubType.UPDATED_AT
  } else if (column.name.endsWith(AutoFieldDefaultNames.AUTO_ID)) {
    column.subtype = AutoFieldSubType.AUTO_ID
  }
  return column
}

/**
 * Processes any date columns and ensures that those without the ignoreTimezones
 * flag set are parsed as UTC rather than local time.
 */
export function processDates<T extends Row | Row[]>(
  table: Table,
  inputRows: T
): T {
  let rows = Array.isArray(inputRows) ? inputRows : [inputRows]
  let datesWithTZ: string[] = []
  for (const [column, schema] of Object.entries(table.schema)) {
    if (schema.type !== FieldType.DATETIME) {
      continue
    }
    if (schema.dateOnly) {
      continue
    }
    if (!schema.timeOnly && !schema.ignoreTimezones) {
      datesWithTZ.push(column)
    }
  }

  for (const row of rows) {
    for (const col of datesWithTZ) {
      if (row[col] && typeof row[col] === "string" && !row[col].endsWith("Z")) {
        let date = new Date(row[col] + "Z")
        if (isNaN(date.getTime())) {
          date = new Date(row[col])
        }
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid date format for column ${col}: ${row[col]}`)
        }
        row[col] = date.toISOString()
      }
    }
  }

  return (Array.isArray(inputRows) ? rows : rows[0]) as T
}
