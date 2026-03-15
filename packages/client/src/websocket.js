import { createWebsocket } from "@budibase/frontend-core"
import { get } from "svelte/store"
import { builderStore, environmentStore } from "@/stores"

let socket

export const initWebsocket = () => {
  const { inBuilder, location } = get(builderStore)
  const { cloud } = get(environmentStore)

  // Only connect when we're inside the builder preview, for now
  if (!(inBuilder && location) || cloud || socket) {
    return
  }

  // Initialise connection
  socket = createWebsocket("/socket/client", {
    heartbeat: false,
  })
}
