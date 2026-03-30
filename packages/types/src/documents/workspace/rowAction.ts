import type { Document } from "../document"

export interface TableRowActions extends Document {
  _id: string
  actions: Record<string, RowActionData>
}

export interface RowActionData {
  name: string
  permissions: RowActionPermissions
}

export interface RowActionPermissions {
  table: { runAllowed: boolean }
  views: Record<string, { runAllowed: boolean }>
}
