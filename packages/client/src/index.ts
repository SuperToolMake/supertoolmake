import type { APIClient } from "@supertoolmake/frontend-core"
import type {
  AppCustomTheme,
  AppNavigation,
  DataFetchDatasource,
  PreviewDevice,
  Screen,
  Snippet,
  Table,
  Theme,
  UIComponentError,
} from "@supertoolmake/types"
import { mount } from "svelte"
import { get } from "svelte/store"
import type { ActionTypes } from "@/constants"
import {
  appStore,
  type authStore,
  blockStore,
  builderStore,
  componentStore,
  dndStore,
  environmentStore,
  eventStore,
  hoverStore,
  type notificationStore,
  routeStore,
  stateStore,
} from "@/stores"
import { initWebsocket } from "@/websocket"
import type Block from "./components/Block.svelte"
import type BlockComponent from "./components/BlockComponent.svelte"
import ClientApp from "./components/ClientApp.svelte"
import UpdatingApp from "./components/UpdatingApp.svelte"

// Set up global PWA install prompt handler
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    window.deferredPwaPrompt = e
  })
}

import * as svelte from "svelte"
// @ts-expect-error
import * as svelteInternal from "svelte/internal/client"
import * as svelteStore from "svelte/store"
// @ts-expect-error
import * as svelteLegacyInternal from "svelte-legacy/internal"
// @ts-expect-error
import * as svelteLegacyStore from "svelte-legacy/store"

window.svelte = svelte
// @ts-expect-error - augmenting the window at runtime
window.svelteLegacyInternal = svelteLegacyInternal
// Provide the legacy global names that Svelte 4 bundles hardcode
// @ts-expect-error - augmenting the window at runtime
window.svelte_internal = svelteLegacyInternal
// @ts-expect-error - augmenting the window at runtime
window.svelte_store = svelteLegacyStore
window.svelteStore = svelteStore
window.svelteInternal = svelteInternal

// Extend global window scope
declare global {
  interface Window {
    // Data from builder
    "##SUPER_APP_ID##": string
    "##SUPER_IN_BUILDER##"?: true
    "##SUPER_PREVIEW_SCREEN##"?: Screen
    "##SUPER_SELECTED_COMPONENT_ID##"?: string
    "##SUPER_PREVIEW_ID##"?: number
    "##SUPER_PREVIEW_THEME##"?: Theme
    "##SUPER_PREVIEW_CUSTOM_THEME##"?: AppCustomTheme
    "##SUPER_PREVIEW_DEVICE##"?: PreviewDevice
    "##SUPER_APP_EMBEDDED##"?: string // This is a bool wrapped in a string
    "##SUPER_PREVIEW_NAVIGATION##"?: AppNavigation
    "##SUPER_HIDDEN_COMPONENT_IDS##"?: string[]
    "##SUPER_SNIPPETS##"?: Snippet[]
    "##SUPER_COMPONENT_ERRORS##"?: Record<string, UIComponentError[]>

    // Other flags
    MIGRATING_APP: boolean

    // PWA install prompt
    deferredPwaPrompt: any

    // Client additions
    handleBuilderRuntimeEvent: (type: string, data: any) => void
    loadBudibase: typeof loadBudibase
    svelte: typeof svelte
    svelteStore: typeof svelteStore
    svelteInternal: typeof svelteInternal
    INIT_TIME: number
  }
}

export interface SDK {
  API: APIClient
  styleable: any
  Provider: any
  ActionTypes: typeof ActionTypes
  fetchDatasourceSchema: any
  fetchDatasourceDefinition: (datasource: DataFetchDatasource) => Promise<Table>
  getRelationshipSchemaAdditions: (schema: Record<string, any>) => Promise<any>
  enrichButtonActions: any
  generateGoldenSample: any
  createContextStore: any
  builderStore: typeof builderStore
  authStore: typeof authStore
  notificationStore: typeof notificationStore
  environmentStore: typeof environmentStore
  appStore: typeof appStore
  Block: typeof Block
  BlockComponent: typeof BlockComponent
}

let app: Record<string, unknown> | undefined

const loadBudibase = async () => {
  // Update builder store with any builder flags
  builderStore.set({
    ...get(builderStore),
    inBuilder: Boolean(window["##SUPER_IN_BUILDER##"]),
    screen: window["##SUPER_PREVIEW_SCREEN##"],
    selectedComponentId: window["##SUPER_SELECTED_COMPONENT_ID##"],
    previewId: window["##SUPER_PREVIEW_ID##"],
    theme: window["##SUPER_PREVIEW_THEME##"],
    customTheme: window["##SUPER_PREVIEW_CUSTOM_THEME##"],
    previewDevice: window["##SUPER_PREVIEW_DEVICE##"],
    navigation: window["##SUPER_PREVIEW_NAVIGATION##"],
    hiddenComponentIds: window["##SUPER_HIDDEN_COMPONENT_IDS##"],
    snippets: window["##SUPER_SNIPPETS##"],
    componentErrors: window["##SUPER_COMPONENT_ERRORS##"],
  })

  // Set app ID - this window flag is set by both the preview and the real
  // server rendered app HTML
  appStore.actions.setAppId(window["##SUPER_APP_ID##"])

  // Set the flag used to determine if the app is being loaded via an iframe
  appStore.actions.setAppEmbedded(window["##SUPER_APP_EMBEDDED##"] === "true")

  if (window.MIGRATING_APP) {
    if (!app) {
      app = mount(UpdatingApp, {
        target: window.document.body,
      })
    }
    return
  }

  // Fetch environment info
  if (!get(environmentStore)?.loaded) {
    await environmentStore.actions.fetchEnvironment()
  }

  // Register handler for runtime events from the builder
  window.handleBuilderRuntimeEvent = (type, data) => {
    if (!window["##SUPER_IN_BUILDER##"]) {
      return
    }
    if (type === "event-completed") {
      eventStore.actions.resolveEvent(data)
    } else if (type === "eject-block") {
      const block = blockStore.actions.getBlock(data)
      block?.eject()
    } else if (type === "dragging-new-component") {
      const { dragging, component } = data
      if (dragging) {
        dndStore.actions.startDraggingNewComponent(component)
      } else {
        dndStore.actions.reset()
      }
    } else if (type === "request-context") {
      const { selectedComponentInstance, screenslotInstance } = get(componentStore)
      const instance = selectedComponentInstance || screenslotInstance
      const context = instance?.getDataContext()
      let stringifiedContext = null
      try {
        stringifiedContext = JSON.stringify(context)
      } catch {
        // Ignore - invalid context
      }
      eventStore.actions.dispatchEvent("provide-context", {
        context: stringifiedContext,
      })
    } else if (type === "hover-component") {
      hoverStore.actions.hoverComponent(data, false)
    } else if (type === "builder-meta") {
      builderStore.actions.setMetadata(data)
    } else if (type === "builder-state") {
      const [[key, value]] = Object.entries(data)
      stateStore.actions.setValue(key, value)
    } else if (type === "builder-url-test-data") {
      const { route, testValue } = data
      routeStore.actions.setTestUrlParams(route, testValue)
    }
  }
  // Initialise websocket
  initWebsocket()

  // Create app if one hasn't been created yet
  if (!app) {
    app = mount(ClientApp, {
      target: window.document.body,
    })
  }
}

// Attach to window so the HTML template can call this when it loads
window.loadBudibase = loadBudibase
