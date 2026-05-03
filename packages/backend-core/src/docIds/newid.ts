import { randomUUID as v4 } from "node:crypto"

export function newid() {
  return v4().replace(/-/g, "")
}
