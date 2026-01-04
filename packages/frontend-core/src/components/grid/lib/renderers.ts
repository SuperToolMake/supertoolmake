import { FieldType, UIColumn } from "@budibase/types"

import OptionsCell from "../cells/OptionsCell.svelte"
import DateCell from "../cells/DateCell.svelte"
import MultiSelectCell from "../cells/MultiSelectCell.svelte"
import NumberCell from "../cells/NumberCell.svelte"
import RelationshipCell from "../cells/RelationshipCell.svelte"
import TextCell from "../cells/TextCell.svelte"
import LongFormCell from "../cells/LongFormCell.svelte"
import BooleanCell from "../cells/BooleanCell.svelte"
import JSONCell from "../cells/JSONCell.svelte"
import BBReferenceCell from "../cells/BBReferenceCell.svelte"
import BBReferenceSingleCell from "../cells/BBReferenceSingleCell.svelte"
import RoleCell from "../cells/RoleCell.svelte"

const TypeComponentMap = {
  [FieldType.STRING]: TextCell,
  [FieldType.OPTIONS]: OptionsCell,
  [FieldType.DATETIME]: DateCell,
  [FieldType.BARCODEQR]: TextCell,
  [FieldType.LONGFORM]: LongFormCell,
  [FieldType.ARRAY]: MultiSelectCell,
  [FieldType.NUMBER]: NumberCell,
  [FieldType.BOOLEAN]: BooleanCell,
  [FieldType.LINK]: RelationshipCell,
  [FieldType.JSON]: JSONCell,
  [FieldType.BB_REFERENCE]: BBReferenceCell,
  [FieldType.BB_REFERENCE_SINGLE]: BBReferenceSingleCell,

  // Custom types for UI only
  role: RoleCell,
}

function getCellRendererByType(type: FieldType | "role" | undefined) {
  if (!type) {
    return
  }

  return TypeComponentMap[type as keyof typeof TypeComponentMap]
}

export const getCellRenderer = (column: UIColumn) => {
  return (
    getCellRendererByType(column.schema?.cellRenderType) ||
    getCellRendererByType(column.schema?.type) ||
    TextCell
  )
}
