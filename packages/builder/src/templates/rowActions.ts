import type { Component, Screen } from "@budibase/types"

export const getRowActionButtonTemplates = async ({
  screen,
  component,
  instance,
}: {
  instance: Component | null
  screen?: Screen
  component?: { _rootId: string }
}) => {
  void screen
  void component
  void instance
  return []
}
