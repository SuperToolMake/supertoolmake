import type { Document } from "@supertoolmake/types"

export {
  Datasource,
  Document,
  FieldSchema,
  Query,
  Row,
  Table,
  TableSchema,
} from "@supertoolmake/types"

export interface Application extends Document {
  _id: string
  appId?: string
}

interface JsonSchemaField {
  properties: {
    [key: string]: {
      type: string
      title: string
      customType?: string
    }
  }
  required?: string[]
}

export interface AutomationStep {
  description: string
  event?: string
  icon: string
  id: string
  inputs: {
    [key: string]: any
  }
  name: string
  schema: {
    inputs: JsonSchemaField
    outputs: JsonSchemaField
  }
  stepId: string
  tagline: string
  type: string
}

export interface Automation extends Document {
  name: string
  type: string
  appId?: string
  definition: {
    steps: AutomationStep[]
    trigger?: AutomationStep
  }
}
