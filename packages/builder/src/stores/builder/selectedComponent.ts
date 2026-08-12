import type { Component } from "@supertoolmake/types"
import { cloneDeep } from "lodash/fp"
import { derived } from "svelte/store"
import { findComponent } from "@/helpers/components"
import { lazyDerived } from "../BudiStore"
import { componentStore } from "./components"
import { selectedScreen } from "./screens"

export const selectedComponent = lazyDerived(() =>
  derived([componentStore, selectedScreen], ([$store, $selectedScreen]): Component | null => {
    if ($selectedScreen && $store.selectedComponentId?.startsWith(`${$selectedScreen._id}-`)) {
      return {
        ...$selectedScreen.props,
        _id: $selectedScreen.props._id!,
      }
    }
    if (!($selectedScreen && $store.selectedComponentId)) {
      return null
    }
    const selected = findComponent($selectedScreen.props, $store.selectedComponentId)
    const clone = selected ? cloneDeep(selected) : selected
    componentStore.migrateSettings(clone)
    return clone
  })
)
