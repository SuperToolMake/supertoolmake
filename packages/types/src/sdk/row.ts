import type { SortOrder, SortType } from "../api"
import type { Row } from "../documents"
import type { WithRequired } from "../shared"
import type { SearchFilters } from "./search"

export interface SearchParams {
  tableId?: string
  viewId?: string
  query?: SearchFilters
  paginate?: boolean
  bookmark?: string | number
  limit?: number
  sort?: string
  sortOrder?: SortOrder
  sortType?: SortType
  version?: string
  disableEscaping?: boolean
  fields?: string[]
  indexer?: () => Promise<any>
  rows?: Row[]
  countRows?: boolean
}

// when searching for rows we want a more extensive search type that requires certain properties
export interface RowSearchParams extends WithRequired<SearchParams, "tableId" | "query"> {}

export interface SearchResponse<T> {
  rows: T[]
  hasNextPage?: boolean
  bookmark?: string | number
  totalRows?: number
}

export enum RowExportFormat {
  CSV = "csv",
  JSON = "json",
  JSON_WITH_SCHEMA = "jsonWithSchema",
}
