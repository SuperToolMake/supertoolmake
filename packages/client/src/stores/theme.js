/* eslint-disable no-useless-concat */

import { DefaultAppTheme, ensureValidTheme } from "@budibase/shared-core"
import { derived } from "svelte/store"
import { appStore } from "./app"
import { builderStore } from "./builder"

// This is the good old acorn bug where having the word "g l o b a l" makes it
// think that this is not ES6 compatible and starts throwing errors when using
// optional chaining. Piss off acorn.
const defaultCustomTheme = {
  primaryColor: "var(--spectrum-global-color-blue-600)",
  primaryColorHover: "var(--spectrum-global-color-blue-500)",
  buttonBorderRadius: "16px",
  navBackground: "var(--spectrum-global-color-gray-100)",
  navTextColor: "var(--spectrum-global-color-gray-800)",
}

const createThemeStore = () => {
  const store = derived([builderStore, appStore], ([$builderStore, $appStore]) => {
    let theme = $appStore.application?.theme
    let customTheme = $appStore.application?.customTheme
    if ($builderStore.inBuilder) {
      theme = $builderStore.theme
      customTheme = $builderStore.customTheme
    }

    // Ensure theme is set
    theme = ensureValidTheme(theme, DefaultAppTheme)

    // Delete and nullish keys from the custom theme
    if (customTheme) {
      Object.entries(customTheme).forEach(([key, value]) => {
        if (value == null || value === "") {
          delete customTheme[key]
        }
      })
    }

    // Merge custom theme with defaults
    customTheme = {
      ...defaultCustomTheme,
      ...customTheme,
    }

    // Build CSS string setting all custom variables
    let customThemeCss = ""
    Object.entries(customTheme).forEach(([key, value]) => {
      customThemeCss += `--${key}:${value};`
    })

    return {
      theme,
      customTheme,
      customThemeCss,
    }
  })

  return {
    subscribe: store.subscribe,
  }
}

export const themeStore = createThemeStore()
