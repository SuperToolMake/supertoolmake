import manifest from "@budibase/client/manifest.json"
import {
  type ComponentDefinition,
  type FetchAppPackageResponse,
  FieldType,
  type Layout,
  type Screen as ScreenDoc,
} from "@budibase/types"
import type { Writable } from "svelte/store"
import { get } from "svelte/store"
import { v4 } from "uuid"
import { DB_TYPE_EXTERNAL } from "@/constants/backend"
import { Component } from "@/templates/Component"
import { Screen } from "@/templates/screenTemplating/Screen"

const getDocId = (): string => {
  return v4().replace(/-/g, "")
}

export const getScreenDocId = (): string => {
  return `screen_${getDocId()}`
}

export const getScreenFixture = (): Screen => {
  return new Screen("test-app")
}

export const getComponentFixture = (type: string): Component | null => {
  if (!type) {
    return null
  }
  return new Component(type)
}

export const COMPONENT_DEFINITIONS: Record<string, ComponentDefinition> =
  manifest as unknown as Record<string, ComponentDefinition>

export const componentsToNested = (components: Component[]): Component | undefined => {
  let nested: Component | undefined
  do {
    const current = components.pop()
    if (!nested) {
      nested = current
      continue
    }
    if (current) {
      current.addChild(nested)
      nested = current
    }
  } while (components.length)
  return nested
}

interface ScreenState {
  screens: ScreenDoc[]
  selectedScreenId?: string
}

export const getFakeScreenPatch = (
  store: {
    screens: Writable<ScreenState>
  } & {
    replace: (screenId: string, screen: ScreenDoc) => Promise<void>
  }
) => {
  return async (patchFn: (screen: ScreenDoc) => void, screenId: string) => {
    const state = get(store.screens)
    const target = state.screens.find((screen) => screen._id === screenId)

    if (target) {
      patchFn(target)
      await store.replace(screenId, target)
    }
  }
}

export const componentDefinitionMap = (): Record<string, ComponentDefinition> => {
  return Object.keys(COMPONENT_DEFINITIONS).reduce(
    (acc, key) => {
      const def = COMPONENT_DEFINITIONS[key]
      acc[`@budibase/standard-components/${key}`] = def
      return acc
    },
    {} as Record<string, ComponentDefinition>
  )
}

export const generateFakeRoutes = (screens: ScreenDoc[]) => {
  return {
    routes: screens.reduce(
      (acc, screen, idx) => {
        const routing = screen.routing
        const route = routing?.route || `/screen_${idx}`
        acc[route] = {
          subpaths: {
            [route]: {
              screens: {
                [routing?.roleId || "BASIC"]: screen._id,
              },
            },
          },
        }
        return acc
      },
      {} as Record<string, any>
    ),
  }
}

interface GenerateAppPackageOptions {
  version?: string
  upgradableVersion?: string
  revertableVersion?: string
  appValidation?: boolean
  name?: string
  url?: string
}

export const generateAppPackage = ({
  version = "1.0.0",
  upgradableVersion,
  revertableVersion,
  appValidation = true,
  name = "Test app",
  url = "/test-app",
}: GenerateAppPackageOptions): FetchAppPackageResponse => {
  const appId = `app_dev_${getDocId()}`

  return {
    application: {
      _id: appId,
      appId,
      version,
      upgradableVersion,
      revertableVersion,
      componentLibraries: ["@budibase/standard-components"],
      name,
      url,
      instance: {
        _id: appId,
      },
      features: {
        componentValidation: appValidation,
        disableUserMetadata: false,
      },
      icon: {
        name: "Apps",
        color: "var(--spectrum-global-color-brand)",
      },
      type: "app",
      tenantId: "test-tenant",
      status: "published",
      template: undefined,
    },
    screens: [],
    layouts: [] as Layout[],
    clientLibPath: `https://cdn.budibase.net/${appId}/budibase-client.js?v=${version}`,
    hasLock: true,
  }
}

export const createAppPackageResponse = (screens: ScreenDoc[] = []): FetchAppPackageResponse => {
  const appId = `app_dev_${getDocId()}`
  return {
    application: {
      _id: appId,
      appId,
      type: "app",
      name: "Test App",
      url: "/test-app",
      version: "1.0.0",
      componentLibraries: ["@budibase/standard-components"],
      instance: {
        _id: appId,
      },
      features: {
        componentValidation: true,
        disableUserMetadata: false,
      },
      icon: {
        name: "Apps",
        color: "var(--spectrum-global-color-brand)",
      },
      tenantId: "test-tenant",
      status: "published",
      template: undefined,
    },
    screens,
    layouts: [] as Layout[],
    clientLibPath: `https://cdn.budibase.net/${appId}/budibase-client.js`,
    hasLock: true,
  }
}

export const clientFeaturesResp = {
  spectrumThemes: true,
  intelligentLoading: true,
  deviceAwareness: true,
  state: true,
  customThemes: true,
  devicePreview: true,
  messagePassing: true,
  rowSelection: true,
  continueIfAction: true,
  showNotificationAction: true,
  sidePanel: true,
}

export const userTableDoc = {
  _id: "ta_users",
  type: "table",
  name: "Users",
  schema: {},
}

export interface ExternalTableDoc {
  type: string
  _id: string
  name: string
  sourceId: string
  sourceType: typeof DB_TYPE_EXTERNAL
  schema: {
    Description: {
      name: string
      type: FieldType
    }
  }
  sql: boolean
}

export const externalTableDoc: ExternalTableDoc = {
  type: "table",
  _id: "datasource_plus_c5e6ae7fbe534da6917c44b284c54b45__Tester",
  name: "Tester",
  sourceId: "datasource_plus_c5e6ae7fbe534da6917c44b284c54b45",
  sourceType: DB_TYPE_EXTERNAL,
  schema: {
    Description: {
      name: "Description",
      type: FieldType.STRING,
    },
  },
  sql: true,
}

export const createAppMetaState = (
  overrides: Partial<{
    features: {
      componentValidation?: boolean
      disableUserMetadata?: boolean
      skeletonLoader?: boolean
    }
  }> = {}
) => ({
  appId: "test-app-id",
  name: "Test App",
  url: "/test-app",
  libraries: ["@budibase/standard-components"],
  clientFeatures: {
    spectrumThemes: true,
    intelligentLoading: true,
    deviceAwareness: true,
    state: true,
    rowSelection: true,
    customThemes: true,
    devicePreview: true,
    messagePassing: true,
    continueIfAction: true,
    showNotificationAction: true,
    sidePanel: true,
  },
  typeSupportPresets: {},
  features: {
    componentValidation: true,
    disableUserMetadata: false,
    ...overrides.features,
  },
  clientLibPath: "https://cdn.budibase.net/test/budibase-client.js",
  hasLock: false,
  appInstance: null,
  initialised: true,
  hasAppPackage: true,
  automations: {},
  routes: {},
  scripts: [],
  translationOverrides: {},
})
