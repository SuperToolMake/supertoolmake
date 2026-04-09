import { getManifest, helpersToRemoveForJs } from "@supertoolmake/string-templates"
import type { Helper } from "@supertoolmake/types"

export function handlebarsCompletions(): Helper[] {
  const manifest = getManifest()
  return Object.values(manifest).flatMap((helpersObj) =>
    Object.entries(helpersObj).map<Helper>(([helperName, helperConfig]) => ({
      text: helperName,
      path: helperName,
      example: helperConfig.example,
      label: helperName,
      displayText: helperName,
      description: helperConfig.description,
      allowsJs: !(helperConfig.requiresBlock || helpersToRemoveForJs.includes(helperName)),
      args: helperConfig.args,
    }))
  )
}
