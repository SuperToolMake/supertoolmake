import { BUDIBASE_DATASOURCE_TYPE, sql } from "@budibase/backend-core"
import { isDatasourceOrDatasourcePlusId } from "@budibase/shared-core"
import {
  ArrayOperator,
  type Datasource,
  type DatasourcePlusQueryResponse,
  type EnrichedQueryJson,
  type FieldConstraints,
  FieldType,
  type QueryJson,
  type Row,
  SourceName,
  SqlClient,
  type Table,
  type TableSchema,
} from "@budibase/types"
import dayjs from "dayjs"
import cloneDeep from "lodash/fp/cloneDeep"
import { getTableFromSource } from "../../../api/controllers/row/utils"
import { Format } from "../../../api/controllers/table/exporters"
import { isRelationshipColumn } from "../../../db/utils"
import env from "../../../environment"
import { isSQL } from "../../../integrations/utils"
import sdk from "../.."

const SQL_CLIENT_SOURCE_MAP: Record<SourceName, SqlClient | undefined> = {
  [SourceName.POSTGRES]: SqlClient.POSTGRES,
  [SourceName.MYSQL]: SqlClient.MY_SQL,
  [SourceName.SQL_SERVER]: SqlClient.MS_SQL,
  [SourceName.MONGODB]: undefined,
  [SourceName.REST]: undefined,
  [SourceName.FIRESTORE]: undefined,
  [SourceName.REDIS]: undefined,
  [SourceName.MINIO]: undefined,
}

const XSS_INPUT_REGEX =
  /[<>;"'(){}]|--|\/\*|\*\/|union|select|insert|drop|delete|update|exec|script/i
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isRequired(presence: FieldConstraints["presence"]) {
  return (
    presence === true ||
    (typeof presence === "object" && presence != null && presence.allowEmpty === false)
  )
}

function parseLimit(limit: string | number | null | undefined): number | undefined {
  if (limit == null || limit === "") {
    return undefined
  }
  const value = Number(limit)
  return Number.isFinite(value) ? value : undefined
}

function parseDate(value: unknown): Date | undefined {
  if (value == null || value === "") {
    return undefined
  }
  const date = new Date(value as string | number | Date)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function validateConstraints(
  value: unknown,
  constraints: FieldConstraints | undefined
): string[] | undefined {
  if (!constraints) {
    return undefined
  }

  const errors: string[] = []
  if (isRequired(constraints.presence) && (value == null || value === "")) {
    errors.push("can't be blank")
  }

  // Validate.js ignored optional empty values unless presence was required.
  if (value == null || value === "") {
    return errors.length ? errors : undefined
  }

  if (constraints.email && (typeof value !== "string" || !EMAIL_REGEX.test(value))) {
    errors.push("is not a valid email")
  }

  if (constraints.inclusion?.length && !constraints.inclusion.includes(value as string)) {
    errors.push("is not included in the list")
  }

  if (constraints.length) {
    const valueLength = typeof value === "string" || Array.isArray(value) ? value.length : undefined
    const minimum = parseLimit(constraints.length.minimum)
    const maximum = parseLimit(constraints.length.maximum)

    if (valueLength != null) {
      if (minimum != null && valueLength < minimum) {
        errors.push(constraints.length.message || `is too short (minimum is ${minimum})`)
      }
      if (maximum != null && valueLength > maximum) {
        errors.push(constraints.length.message || `is too long (maximum is ${maximum})`)
      }
    }
  }

  if (constraints.numericality) {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) {
      errors.push("is not a number")
    } else {
      const minimum = parseLimit(constraints.numericality.greaterThanOrEqualTo)
      const maximum = parseLimit(constraints.numericality.lessThanOrEqualTo)
      if (minimum != null && numericValue < minimum) {
        errors.push(`must be greater than or equal to ${minimum}`)
      }
      if (maximum != null && numericValue > maximum) {
        errors.push(`must be less than or equal to ${maximum}`)
      }
    }
  }

  if (constraints.datetime && value) {
    const dateValue = parseDate(value)
    if (!dateValue) {
      errors.push("is not a valid date")
    } else {
      const earliest = parseDate(constraints.datetime.earliest)
      const latest = parseDate(constraints.datetime.latest)
      if (earliest && dateValue.getTime() < earliest.getTime()) {
        errors.push(`must be no earlier than ${constraints.datetime.earliest}`)
      }
      if (latest && dateValue.getTime() > latest.getTime()) {
        errors.push(`must be no later than ${constraints.datetime.latest}`)
      }
    }
  }

  return errors.length ? errors : undefined
}

export function getSQLClient(datasource: Datasource): SqlClient {
  if (!isSQL(datasource)) {
    throw new Error("Cannot get SQL Client for non-SQL datasource")
  }
  const lookup = SQL_CLIENT_SOURCE_MAP[datasource.source]
  if (lookup) {
    return lookup
  }
  throw new Error("Unable to determine client for SQL datasource")
}

export function processRowCountResponse(response: DatasourcePlusQueryResponse): number {
  if (response && response.length === 1 && sql.COUNT_FIELD_NAME in response[0]) {
    const total = response[0][sql.COUNT_FIELD_NAME]
    return typeof total === "number" ? total : parseInt(total)
  } else {
    throw new Error("Unable to count rows in query - no count response")
  }
}

function processInternalTables(tables: Table[]) {
  const tableMap: Record<string, Table> = {}
  for (const table of tables) {
    // update the table name, should never query by name for SQLite
    table.originalName = table.name
    table.name = table._id!
    tableMap[table._id!] = table
  }
  return tableMap
}

export async function enrichQueryJson(json: QueryJson): Promise<EnrichedQueryJson> {
  let datasource: Datasource | undefined

  if (typeof json.endpoint.datasourceId === "string") {
    if (json.endpoint.datasourceId !== BUDIBASE_DATASOURCE_TYPE) {
      datasource = await sdk.datasources.get(json.endpoint.datasourceId, {
        enriched: true,
      })
    }
  } else {
    datasource = await sdk.datasources.enrich(json.endpoint.datasourceId)
  }

  let tables: Record<string, Table>
  if (datasource) {
    tables = datasource.entities || {}
  } else {
    tables = processInternalTables(await sdk.tables.getAllInternalTables())
  }

  let table: Table
  if (typeof json.endpoint.entityId === "string") {
    let entityId = json.endpoint.entityId
    if (isDatasourceOrDatasourcePlusId(entityId)) {
      entityId = sql.utils.breakExternalTableId(entityId).tableName
    }
    table = tables[entityId]
  } else {
    table = json.endpoint.entityId
  }

  return {
    operation: json.endpoint.operation,
    table,
    tables,
    datasource: datasource!,
    schema: json.endpoint.schema,
    ...json,
  }
}

export function cleanExportRows(
  rows: Row[],
  schema: TableSchema,
  format: string,
  columns?: string[],
  customHeaders: { [key: string]: string } = {}
) {
  const cleanRows = [...rows]

  const relationships = Object.entries(schema)
    .filter((entry) => entry[1].type === FieldType.LINK)
    .map((entry) => entry[0])

  relationships.forEach((column) => {
    cleanRows.forEach((row) => {
      delete row[column]
    })
    delete schema[column]
  })

  if (format === Format.CSV) {
    // Intended to append empty values in export
    const schemaKeys = Object.keys(schema)
    for (const key of schemaKeys) {
      if (columns?.length && columns.indexOf(key) > 0) {
        continue
      }
      for (const row of cleanRows) {
        if (row[key] == null) {
          row[key] = undefined
        }
      }
    }
  } else if (format === Format.JSON) {
    // Replace row keys with custom headers
    for (const row of cleanRows) {
      renameKeys(customHeaders, row)
    }
  }

  return cleanRows
}

function renameKeys(keysMap: { [key: string]: any }, row: any) {
  for (const key in keysMap) {
    Object.defineProperty(row, keysMap[key], Object.getOwnPropertyDescriptor(row, key) || {})
    delete row[key]
  }
}

function isForeignKey(key: string, table: Table) {
  const relationships = Object.values(table.schema).filter(isRelationshipColumn)
  return relationships.some((relationship) => (relationship as any).foreignKey === key)
}

export async function validate({ source, row }: { source: Table; row: Row }): Promise<{
  valid: boolean
  errors: Record<string, any>
}> {
  const table = await getTableFromSource(source)
  const errors: Record<string, any> = {}
  const disallowArrayTypes = [FieldType.BB_REFERENCE_SINGLE]
  for (const fieldName of Object.keys(table.schema)) {
    const column = table.schema[fieldName]
    const type = column.type
    let constraints = cloneDeep(column.constraints)

    // Ensure display column is required
    if (table.primaryDisplay === fieldName) {
      constraints = { ...constraints, presence: true }
    }

    // foreign keys are likely to be enriched
    if (isForeignKey(fieldName, table)) {
      continue
    }
    if (column.autocolumn) {
      continue
    }
    // special case for options, need to always allow unselected (empty)
    if (type === FieldType.OPTIONS && constraints?.inclusion) {
      constraints.inclusion.push(null as any, "")
    }

    if (disallowArrayTypes.includes(type) && Array.isArray(row[fieldName])) {
      errors[fieldName] = `Cannot accept arrays`
    }
    let res

    // Validate.js doesn't seem to handle array
    if (type === FieldType.ARRAY && row[fieldName]) {
      if (row[fieldName].length) {
        if (!Array.isArray(row[fieldName])) {
          row[fieldName] = row[fieldName].split(",")
        }
        row[fieldName].map((val: any) => {
          if (!constraints?.inclusion?.includes(val) && constraints?.inclusion?.length !== 0) {
            errors[fieldName] = "Field not in list"
          }
        })
      } else if (constraints?.presence && row[fieldName].length === 0) {
        // non required MultiSelect creates an empty array, which should not throw errors
        errors[fieldName] = [`${fieldName} is required`]
      }
    } else if (type === FieldType.DATETIME && column.timeOnly) {
      res = validateTimeOnlyField(fieldName, row[fieldName], constraints)
    } else {
      res = validateConstraints(row[fieldName], constraints)
    }

    if (env.XSS_SAFE_MODE && typeof row[fieldName] === "string") {
      if (XSS_INPUT_REGEX.test(row[fieldName])) {
        errors[fieldName] = ["Input not sanitised - potentially vulnerable to XSS"]
      }
    }

    if (res) errors[fieldName] = res
  }
  return { valid: Object.keys(errors).length === 0, errors }
}

function validateTimeOnlyField(
  fieldName: string,
  value: any,
  constraints: FieldConstraints | undefined
) {
  let res
  if (value && !sql.utils.isValidTime(value)) {
    res = [`"${fieldName}" is not a valid time`]
  } else if (constraints) {
    let castedValue = value
    const stringTimeToDate = (value: string) => {
      const [hour, minute, second] = value.split(":").map((x: string) => Number(x))
      let date = dayjs("2000-01-01T00:00:00.000Z").hour(hour).minute(minute)
      if (!Number.isNaN(second)) {
        date = date.second(second)
      }
      return date
    }

    if (castedValue) {
      castedValue = stringTimeToDate(castedValue)
    }
    const castedConstraints = cloneDeep(constraints)

    let earliest, latest
    let easliestTimeString: string, latestTimeString: string
    if (castedConstraints.datetime?.earliest) {
      easliestTimeString = castedConstraints.datetime.earliest
      if (dayjs(castedConstraints.datetime.earliest).isValid()) {
        easliestTimeString = dayjs(castedConstraints.datetime.earliest).format("HH:mm")
      }
      earliest = stringTimeToDate(easliestTimeString)
    }
    if (castedConstraints.datetime?.latest) {
      latestTimeString = castedConstraints.datetime.latest
      if (dayjs(castedConstraints.datetime.latest).isValid()) {
        latestTimeString = dayjs(castedConstraints.datetime.latest).format("HH:mm")
      }
      latest = stringTimeToDate(latestTimeString)
    }

    if (earliest && latest && earliest.isAfter(latest)) {
      latest = latest.add(1, "day")
      if (earliest.isAfter(castedValue)) {
        castedValue = castedValue.add(1, "day")
      }
    }

    if (earliest || latest) {
      castedConstraints.datetime = {
        earliest: earliest?.toISOString() || "",
        latest: latest?.toISOString() || "",
      }
    }

    let jsValidation = validateConstraints(castedValue?.toISOString(), castedConstraints)
    jsValidation = jsValidation?.map((m: string) =>
      m
        ?.replace(castedConstraints.datetime?.earliest || "", easliestTimeString || "")
        .replace(castedConstraints.datetime?.latest || "", latestTimeString || "")
    )
    if (jsValidation) {
      res ??= []
      res.push(...jsValidation)
    }
  }

  return res
}

// type-guard check
export function isArrayFilter(operator: any): operator is ArrayOperator {
  return Object.values(ArrayOperator).includes(operator)
}

export function getSource(tableId: string) {
  return sdk.tables.getTable(tableId)
}
