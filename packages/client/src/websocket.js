import { createWebsocket } from "@supertoolmake/frontend-core"
import { get } from "svelte/store"
import { builderStore } from "@/stores"

let socket

export const initWebsocket = () => {
  const { inBuilder, location } = get(builderStore)

  // Only connect when we're inside the builder preview, for now
  if (!(inBuilder && location) || socket) {
    return
  }

  // Initialise connection
  socket = createWebsocket("/socket/client", {
    heartbeat: false,
  })
}
