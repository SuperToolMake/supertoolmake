import { Row, Table, TableRequest, TableSchema } from "../../../documents"

export interface FindTableResponse extends Table {}

export type FetchTablesResponse = FindTableResponse[]

export interface SaveTableRequest extends TableRequest {
  rows?: Row[]
}
export type SaveTableResponse = Table

export interface BulkImportRequest {
  rows: Row[]
  identifierFields?: Array<string>
}
export interface BulkImportResponse {
  message: string
}

export interface MigrateTableRequest {
  oldColumn: string
  newColumn: string
}
export interface MigrateTableResponse {
  message: string
}

export interface ValidateNewTableImportRequest {
  rows: Row[]
  schema: TableSchema
}
export interface ValidateTableImportRequest {
  tableId?: string
  rows: Row[]
}
export interface ValidateTableImportResponse {
  schemaValidation: {
    [field: string]: boolean
  }
  allValid: boolean
  invalidColumns: Array<string>
  errors: Record<string, string>
}

export interface CsvToJsonRequest {
  csvString: string
}
export type CsvToJsonResponse = any[]

export interface DeleteTableResponse {
  message: string
}
