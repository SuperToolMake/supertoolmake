import { ArrayOperator } from "@budibase/types"
import type { Operator } from "@/types"

/**
 * Check if the supplied filter operator is for an array
 * @param op
 */
export function isArrayOperator(op: Operator): op is ArrayOperator {
  return op === ArrayOperator.CONTAINS_ANY || op === ArrayOperator.ONE_OF
}
