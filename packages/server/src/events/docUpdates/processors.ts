import { docUpdates } from "@budibase/backend-core"
import workspaceResourceProcessor from "./workspaceFavourites"

let started = false

export function init() {
  if (started) {
    return
  }
  const processors = [workspaceResourceProcessor()]
  docUpdates.init(processors)
  started = true
}
