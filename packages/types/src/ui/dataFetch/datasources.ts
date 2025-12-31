import { Row, TableSchema } from "../../documents"

export type DataFetchDatasource =
  | TableDatasource
  | QueryDatasource
  | RelationshipDatasource
  | UserDatasource
  | CustomDatasource
  | NestedProviderDatasource
  | FieldDatasource
  | QueryArrayFieldDatasource
  | JSONArrayFieldDatasource

export interface TableDatasource {
  type: "table"
  tableId: string
}

export interface QueryDatasource {
  type: "query"
  _id: string
  fields: Record<string, any> & {
    pagination?: {
      type: string
      location: string
      pageParam: string
    }
  }
  queryParams?: Record<string, string>
  parameters: { name: string; default: string }[]
}

export interface RelationshipDatasource {
  type: "link"
  tableId: string
  rowId: string
  rowTableId: string
  fieldName: string
}

export interface UserDatasource {
  type: "user"
}

export interface CustomDatasource {
  type: "custom"
  data: any
}

export interface NestedProviderDatasource {
  type: "provider"
  value?: {
    schema: TableSchema
    primaryDisplay: string
    rows: Row[]
  }
}

interface BaseFieldDatasource<
  TType extends "field" | "queryarray" | "jsonarray",
> {
  type: TType
  tableId: string
  fieldType: "attachment" | "array"
  fieldName: string
  value: string[] | Row[]
}

export type FieldDatasource = BaseFieldDatasource<"field">
export type QueryArrayFieldDatasource = BaseFieldDatasource<"queryarray">
export type JSONArrayFieldDatasource = BaseFieldDatasource<"jsonarray">
