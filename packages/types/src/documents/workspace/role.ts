import type { BuiltinPermissionID, PermissionLevel } from "../../sdk"
import type { Document } from "../document"

export interface RoleUIMetadata {
  displayName?: string
  color?: string
  description?: string
}

export interface Role extends Document {
  permissionId: BuiltinPermissionID
  inherits?: string | string[]
  permissions: Record<string, PermissionLevel[]>
  version?: string
  name: string
  uiMetadata?: RoleUIMetadata
}
