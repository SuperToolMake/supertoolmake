import type { SaveRowRequest, SaveTableRequest, UIDatasource, UIRow } from "@supertoolmake/types"

interface DatasourceBaseActions<TSaveDefinitionRequest = SaveTableRequest> {
  saveDefinition: (newDefinition: TSaveDefinitionRequest) => Promise<void>
  addRow: (row: SaveRowRequest) => Promise<UIRow | undefined>
  updateRow: (row: SaveRowRequest) => Promise<UIRow | undefined>
  deleteRows: (rows: UIRow[]) => Promise<void>
  getRow: (id: string) => Promise<UIRow | undefined>
  isDatasourceValid: (datasource: UIDatasource) => boolean | undefined
  canUseColumn: (name: string) => boolean | undefined
}

export interface DatasourceTableActions extends DatasourceBaseActions<SaveTableRequest> {}

export interface DatasourceNonPlusActions extends DatasourceBaseActions<never> {}

export type DatasourceActions = DatasourceTableActions & DatasourceNonPlusActions
