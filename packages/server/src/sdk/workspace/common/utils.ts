import {
  isDatasourceOrDatasourcePlusId,
  isQueryId,
  isTableIdOrExternalTableId,
} from "@budibase/shared-core"
import { SourceType } from "@budibase/types"

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
