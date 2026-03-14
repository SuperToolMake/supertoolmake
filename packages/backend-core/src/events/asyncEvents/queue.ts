import type { Event, Identity } from "@budibase/types"
import { BudibaseQueue, JobQueue } from "../../queue"

export interface EventPayload {
  event: Event
  identity: Identity
  properties: any
  timestamp?: string | number
}

export let asyncEventQueue: BudibaseQueue<EventPayload>

export function init() {
  asyncEventQueue = new BudibaseQueue<EventPayload>(JobQueue.SYSTEM_EVENT_QUEUE, {
    jobTags: (event: EventPayload) => {
      return {
        "event.name": event.event,
      }
    },
  })
}

export async function shutdown() {
  if (asyncEventQueue) {
    await asyncEventQueue.close()
  }
}
