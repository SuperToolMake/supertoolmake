import "./styles"

import Manifest from "manifest.json"
import { derived, get, writable } from "svelte/store"
import Router from "../components/Router.svelte"
import { findComponentById, findComponentPathById } from "../utils/components"
import { builderStore } from "./builder"
import { devToolsStore } from "./devTools"
import { screenStore } from "./screens"

import * as AppComponents from "../components/app/index.ts"
import { ScreenslotID, ScreenslotType } from "../constants"

export const BudibasePrefix = "@budibase/standard-components/"

const builtInComponentCache = new Map()
const builtInComponentPromises = new Map()

const createComponentStore = () => {
  const store = writable({
    mountedComponents: {},
  })

  const derivedStore = derived(
    [store, builderStore, devToolsStore, screenStore],
    ([$store, $builderStore, $devToolsStore, $screenStore]) => {
      const { inBuilder, selectedComponentId } = $builderStore

      // Avoid any of this logic if we aren't in the builder preview
      if (!inBuilder && !$devToolsStore.visible) {
        return {}
      }

      const root = $screenStore.activeScreen?.props
      const component = findComponentById(root, selectedComponentId)
      const definition = getComponentDefinition(component?._component)

      // Derive the selected component path
      const selectedPath =
        findComponentPathById(root, selectedComponentId) || []

      return {
        selectedComponentInstance:
          $store.mountedComponents[selectedComponentId],
        selectedComponent: component,
        selectedComponentDefinition: definition,
        selectedComponentPath: selectedPath?.map(component => component._id),
        mountedComponentCount: Object.keys($store.mountedComponents).length,
        screenslotInstance: $store.mountedComponents[ScreenslotID],
      }
    }
  )

  const registerInstance = (id, instance) => {
    if (!id) {
      return
    }
    store.update(state => {
      // Register to mounted components
      state.mountedComponents[id] = instance
      return state
    })
  }

  const unregisterInstance = id => {
    if (!id) {
      return
    }
    store.update(state => {
      // Remove from mounted components
      delete state.mountedComponents[id]
      return state
    })
  }

  const isComponentRegistered = id => {
    return get(store).mountedComponents[id] != null
  }

  const getComponentById = id => {
    const root = get(screenStore).activeScreen?.props
    return findComponentById(root, id)
  }

  const getComponentDefinition = type => {
    if (!type) {
      return null
    }

    // Screenslot is an edge case
    if (type === ScreenslotType) {
      type = `${BudibasePrefix}${type}`
    }

    // Handle built-in components
    type = type.replace(BudibasePrefix, "")
    return type ? Manifest[type] : null
  }

  const getComponentConstructor = type => {
    if (!type) {
      return null
    }
    if (type === ScreenslotType) {
      return Router
    }

    const split = type.split("/")
    const name = split[split.length - 1]

    if (builtInComponentCache.has(name)) {
      return builtInComponentCache.get(name)
    }

    if (builtInComponentPromises.has(name)) {
      return builtInComponentPromises.get(name)
    }

    const loader = AppComponents[name]
    if (!loader) {
      console.warn(`Component loader missing for ${name}`)
      return null
    }

    const promise = loader()
      .then(module => {
        const Component = module?.default ?? null
        if (Component) {
          builtInComponentCache.set(name, Component)
        }
        builtInComponentPromises.delete(name)
        return Component
      })
      .catch(error => {
        builtInComponentPromises.delete(name)
        console.error(`Failed to load component ${name}`, error)
        return null
      })

    builtInComponentPromises.set(name, promise)
    return promise
  }

  const getComponentInstance = id => {
    return derived(store, $store => $store.mountedComponents[id])
  }

  return {
    ...derivedStore,
    actions: {
      registerInstance,
      unregisterInstance,
      isComponentRegistered,
      getComponentById,
      getComponentDefinition,
      getComponentConstructor,
      getComponentInstance,
    },
  }
}

export const componentStore = createComponentStore()
