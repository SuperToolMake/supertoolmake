import type { User } from "@supertoolmake/types"

export interface UIUser extends User {
  sessionId: string
  gridMetadata?: { focusedCellId?: string }
  builderMetadata?: { selectedResourceId?: string }
}
