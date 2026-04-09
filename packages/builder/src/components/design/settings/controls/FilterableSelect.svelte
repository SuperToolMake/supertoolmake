<script lang="ts">
import { Select } from "@supertoolmake/bbui"
import { makePropSafe as safe } from "@supertoolmake/string-templates"
import type { Component } from "@supertoolmake/types"
import { findAllComponents, getComponentContexts } from "@/helpers/components"
import { selectedScreen } from "@/stores/builder"

export let value: string | undefined = undefined

const getProviders = (rootComponent: Component | undefined) => {
  if (!rootComponent) {
    return []
  }
  return findAllComponents(rootComponent)
    .filter((component) => {
      return getComponentContexts(component._component).some((ctx) =>
        ctx.actions?.find(
          (act) =>
            act.type === "AddDataProviderQueryExtension" ||
            act.type === "AddDataProviderFilterExtension"
        )
      )
    })
    .map((provider) => ({
      label: provider._instanceName,
      value: `{{ literal ${safe(provider._id)} }}`,
      subtitle: `${provider?.dataSource?.label || provider?.table?.label || "-"}`,
    }))
}

$: providers = getProviders($selectedScreen?.props)
</script>

<Select {value} options={providers} on:change />
