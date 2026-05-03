import { randomUUID as v4 } from "node:crypto"

export const uuid = v4

export const email = () => {
  return `${uuid()}@example.com`
}
