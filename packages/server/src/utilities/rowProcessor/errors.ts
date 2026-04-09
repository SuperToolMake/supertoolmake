import type { BBReferenceFieldSubType } from "@supertoolmake/types"

export class InvalidBBRefError extends Error {
  constructor(id: string, subtype: BBReferenceFieldSubType) {
    super(`Id "${id}" is not valid for the subtype "${subtype}"`)
  }
}
