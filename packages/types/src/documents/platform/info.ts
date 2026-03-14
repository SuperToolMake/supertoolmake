import type { Document } from "../document"

export type GlobalInfo = {}

export interface Installation extends Document {
  _id: string
  installId: string
  version: string
}
