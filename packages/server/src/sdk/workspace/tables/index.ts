import * as create from "./create"
import { duplicate } from "./duplicate"
import * as getters from "./getters"
import { migrate } from "./migration"
import * as updates from "./update"
import * as utils from "./utils"
import { populateExternalTableSchemas } from "./validation"

export default {
  populateExternalTableSchemas,
  ...create,
  ...updates,
  ...getters,
  ...utils,
  migrate,
  duplicate,
}
