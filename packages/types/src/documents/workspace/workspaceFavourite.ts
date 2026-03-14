import type { WorkspaceResource } from "../../api"
import type { Document } from "../document"

export interface WorkspaceFavourite extends Document {
  resourceType: WorkspaceResource
  resourceId: string
  createdBy: string
}
