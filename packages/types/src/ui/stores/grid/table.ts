import {
  FieldSchema,
  FieldType,
  RelationSchemaField,
  SortOrder,
  Table,
  UIRow,
  UISearchFilter,
} from "@budibase/types"

export interface UITable extends Table {
  name: string
  id: string
  tableId: string
  primaryDisplay?: string
  sort?: {
    field: string
    order: SortOrder
  }
  queryUI: UISearchFilter
  schema: Record<string, UIFieldSchema>
}

export type UIFieldSchema = FieldSchema & {
  cellRenderType?: string
  columns?: Record<string, UIRelationSchemaField>
  disabled?: boolean
  related?: { field: string; subField: string }
  format?: (row: UIRow) => any
}

interface UIRelationSchemaField extends RelationSchemaField {
  type: FieldType
}
