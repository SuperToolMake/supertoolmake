import type { UITable } from "@supertoolmake/types"

export type UIDatasource = UITable

export interface UIFieldMutation {
  visible?: boolean
  readonly?: boolean
  width?: number
  order?: number
}
