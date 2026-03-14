import type { Document } from "../document"
import type { AppNavigation } from "./workspace"

export interface WorkspaceApp extends Document {
  name: string
  url: string
  navigation: AppNavigation
  isDefault: boolean
  disabled?: boolean
}
