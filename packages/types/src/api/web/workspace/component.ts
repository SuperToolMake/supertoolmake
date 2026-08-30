import type { ComponentDefinition } from "../../../ui/components"

export type FetchComponentDefinitionResponse = Record<string, ComponentDefinition> & {
  features?: ComponentDefinition["features"]
  typeSupportPresets?: ComponentDefinition["typeSupportPresets"]
}
