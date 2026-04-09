import {
  isDatasourceOrDatasourcePlusId,
  isQueryId,
  isTableIdOrExternalTableId,
} from "@supertoolmake/shared-core"
import { SourceType } from "@supertoolmake/types"

export function getSourceType(sourceId: string): SourceType {
  if (isTableIdOrExternalTableId(sourceId)) {
    return SourceType.TABLE
  } else if (isDatasourceOrDatasourcePlusId(sourceId)) {
    return SourceType.DATASOURCE
  } else if (isQueryId(sourceId)) {
    return SourceType.QUERY
  }
  throw new Error(`Unknown source type for source "${sourceId}"`)
}
