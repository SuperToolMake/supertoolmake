import type { Integration, SourceName } from "@supertoolmake/types"

export interface UIIntegration extends Integration {
  name: SourceName
}
