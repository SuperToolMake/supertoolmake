import * as sharedCore from "@budibase/shared-core"
import { UIFieldSchema } from "@budibase/types"

export function canBeDisplayColumn(column: UIFieldSchema) {
  if (!sharedCore.canBeDisplayColumn(column.type)) {
    return false
  }
  // If it's a related column (only available in the frontend), don't allow using it as display column
  if (column.related) {
    return false
  }
  return true
}

export function canBeSortColumn(columnSchema: UIFieldSchema) {
  if (!sharedCore.canBeSortColumn(columnSchema.type)) {
    return false
  }
  // If it's a related column (only available in the frontend), don't allow using it as display column
  if (columnSchema.related) {
    return false
  }
  return true
}
