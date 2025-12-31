export interface UIEvent extends Omit<Event, "target"> {
  currentTarget: EventTarget & HTMLInputElement
  key?: string
  target?: any
}

export interface UITableResource {
  type: "table"
  label: string
  tableId: string
  resourceId: string
}

export interface UIFile {
  size: number
  name: string
  url: string
  extension: string
  key: string
  type?: string
}
