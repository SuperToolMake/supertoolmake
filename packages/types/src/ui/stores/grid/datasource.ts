import type { Datasource, Table, UITable } from "@budibase/types"

export type UIDatasource = UITable

export interface UIFieldMutation {
  visible?: boolean
  readonly?: boolean
  width?: number
  order?: number
}
