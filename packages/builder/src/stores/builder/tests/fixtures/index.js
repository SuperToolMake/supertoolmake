import { v4 } from "uuid"
import { Component } from "@/templates/Component"
import { Screen } from "@/templates/screenTemplating/Screen"
import { get } from "svelte/store"
import { DB_TYPE_EXTERNAL } from "@/constants/backend"
import { FieldType } from "@budibase/types"
import manifest from "@budibase/client/manifest.json"

const getDocId = () => {
  return v4().replace(/-/g, "")
}

export const getScreenDocId = () => {
  return `screen_${getDocId()}`
}

export const getScreenFixture = () => {
  return new Screen()
}

export const getComponentFixture = type => {
  if (!type) {
    return null
  }
  return new Component(type)
}

// All currently defined component definitions in the client.
export const COMPONENT_DEFINITIONS = manifest

// Take a component array and turn it into a deeply nested tree
export const componentsToNested = components => {
  let nested
  do {
    const current = components.pop()
    if (!nested) {
      nested = current
      continue
    }
    //review this for the empty
    current.addChild(nested)
    nested = current
  } while (components.length)
  return nested
}

export const getFakeScreenPatch = store => {
  return async (patchFn, screenId) => {
    const target = get(store).screens.find(screen => screen._id === screenId)

    patchFn(target)

    await store.replace(screenId, target)
  }
}

export const componentDefinitionMap = () => {
  return Object.keys(COMPONENT_DEFINITIONS).reduce((acc, key) => {
    const def = COMPONENT_DEFINITIONS[key]
    acc[`@budibase/standard-components/${key}`] = def
    return acc
  }, {})
}

export const generateFakeRoutes = screens => {
  return {
    routes: screens.reduce((acc, screen, idx) => {
      let routing = screen.routing
      let route = routing.route || "/screen_" + idx
      acc[route] = {
        subpaths: {
          [route]: {
            screens: {
              [routing.roleId]: screen._id,
            },
          },
        },
      }
      return acc
    }, {}),
  }
}

export const generateAppPackage = ({
  version = "1.0.0",
  upgradableVersion,
  revertableVersion,
  appValidation = true,
  disableUserMetadata = true,
  name = "Test app",
  url = "/test-app",
}) => {
  const appId = "app_dev_" + getDocId()

  const features = {}
  features["componentValidation"] = appValidation

  if (disableUserMetadata) {
    features["disableUserMetadata"] = false
  }

  return {
    application: {
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
      features,
      icon: {},
      type: "app",
    },
    pwa: {},
    clientLibPath: `https://cdn.budibase.net/${appId}/budibase-client.js?v=${version}`,
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

export const externalTableDoc = {
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
