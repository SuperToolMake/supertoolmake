// @ts-expect-error we don't have types for it
import helpers from "@budibase/handlebars-helpers"
import type Handlebars from "handlebars"
import { EXTERNAL_FUNCTION_COLLECTIONS, HelperFunctionBuiltin } from "./constants"
import { date, difference, duration, durationFromNow } from "./date"

const ADDED_HELPERS = {
  date,
  duration,
  difference,
  durationFromNow,
}

export const externalCollections = EXTERNAL_FUNCTION_COLLECTIONS
export const addedHelpers = ADDED_HELPERS

export function registerAll(handlebars: typeof Handlebars) {
  for (const [name, helper] of Object.entries(ADDED_HELPERS)) {
    handlebars.registerHelper(name, helper)
  }
  const externalNames = []
  for (const collection of EXTERNAL_FUNCTION_COLLECTIONS) {
    // collect information about helper
    const hbsHelperInfo = helpers[collection]()
    for (const entry of Object.entries(hbsHelperInfo)) {
      const name = entry[0]
      // skip built-in functions and ones seen already
      if (HelperFunctionBuiltin.indexOf(name) !== -1 || externalNames.indexOf(name) !== -1) {
        continue
      }
      externalNames.push(name)
    }
    // attach it to our handlebars instance
    helpers[collection]({
      handlebars,
    })
  }
  // add date external functionality
  externalHelperNames = externalNames.concat(Object.keys(ADDED_HELPERS))
}

export function unregisterAll(handlebars: typeof Handlebars) {
  for (const name of Object.keys(ADDED_HELPERS)) {
    handlebars.unregisterHelper(name)
  }
  for (const name of externalHelperNames) {
    handlebars.unregisterHelper(name)
  }
  externalHelperNames = []
}

export let externalHelperNames: any[] = []
