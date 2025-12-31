import { Datasource, Table, UITable } from "@budibase/types"

export type UIDatasource = UITable

export interface UIFieldMutation {
  visible?: boolean
  readonly?: boolean
  width?: number
  order?: number
}

// when building the internal DS - seems to represent it slightly differently to the backend typing of a DS
export interface UIInternalDatasource extends Omit<Datasource, "entities"> {
  entities: Table[]
}
