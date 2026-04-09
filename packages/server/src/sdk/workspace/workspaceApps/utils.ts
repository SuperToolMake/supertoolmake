import { db } from "@supertoolmake/backend-core"
import type { WorkspaceApp } from "@supertoolmake/types"
import sdk from "../.."

export async function getMatchedWorkspaceApp(fromUrl: string): Promise<WorkspaceApp | undefined> {
  const workspace = await sdk.workspaces.metadata.get()
  // Apps are at /app/{app-name} since there's only one workspace
  const baseUrl = db.isProdWorkspaceID(workspace.appId) ? "/app" : `/${workspace.appId}`

  const embedUrl = db.isProdWorkspaceID(workspace.appId) ? "/embed" : null

  const allWorkspaceApps = await sdk.workspaceApps.fetch()

  function isWorkspaceAppMatch({ url, isDefault }: WorkspaceApp) {
    return (
      fromUrl.replace(/\/$/, "") === `${baseUrl}${url.replace(/\/$/, "")}` ||
      (embedUrl && fromUrl.replace(/\/$/, "") === `${embedUrl}${url.replace(/\/$/, "")}`) ||
      (!fromUrl && isDefault) // Support getMatchedWorkspaceApp without url referrer
    )
  }

  const matchedWorkspaceApp = allWorkspaceApps.find(isWorkspaceAppMatch)
  return matchedWorkspaceApp
}
