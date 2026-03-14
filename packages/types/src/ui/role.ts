import type { Role, RoleUIMetadata } from "../documents"
import type { WithRequired } from "../shared"

export interface UIRole extends WithRequired<Role, "_id" | "_rev"> {
  uiMetadata: Required<RoleUIMetadata>
}
