import type { SocketSession, Workspace } from "@supertoolmake/types"
import { builderSocket } from "../../websockets"

export const enrichApps = async (apps: Workspace[]) => {
  // Sessions can only exist for dev app IDs
  const devAppIds = apps.filter((app) => app.status === "development").map((app) => app.appId)

  // Get all sessions for all workspaces and enrich workspace list
  const sessions = await builderSocket?.getRoomSessions(devAppIds)
  if (sessions?.length) {
    const appSessionMap: Record<string, SocketSession[]> = {}
    sessions.forEach((session) => {
      const room = session.room
      if (!room) {
        return
      }
      if (!appSessionMap[room]) {
        appSessionMap[room] = []
      }
      appSessionMap[room].push(session)
    })
    return apps.map((app) => {
      // Shallow clone to avoid mutating original reference
      const enriched = { ...app }
      const sessions = appSessionMap[app.appId]
      if (sessions?.length) {
        enriched.sessions = sessions
      } else {
        delete enriched.sessions
      }
      return enriched
    })
  } else {
    return apps
  }
}
