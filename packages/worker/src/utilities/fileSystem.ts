import { readFileSync } from "node:fs"

export function readStaticFile(path: string) {
  return readFileSync(path, "utf-8")
}
