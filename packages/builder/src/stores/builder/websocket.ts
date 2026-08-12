import { notifications } from "@supertoolmake/bbui"
import { createWebsocket } from "@supertoolmake/frontend-core"
import { BuilderSocketEvent, helpers, SocketEvent } from "@supertoolmake/shared-core"
import type { Datasource, Role, Screen, Table, UIUser, WorkspaceApp } from "@supertoolmake/types"
import { get } from "svelte/store"
import { appsStore, auth } from "@/stores/portal"
import { appStore } from "./app"
import { datasources } from "./datasources"
import { deploymentStore } from "./deployment"
import { navigationStore } from "./navigation"
import { roles } from "./roles"
import { screenStore } from "./screens"
import { snippets } from "./snippets"
import { tables } from "./tables"
import { themeStore } from "./theme"
import { userStore } from "./users"
import { workspaceAppStore } from "./workspaceApps"
import { workspaceDeploymentStore } from "./workspaceDeployment"

export const createBuilderWebsocket = (appId: string) => {
  const socket = createWebsocket("/socket/builder")

  // Built-in events
  socket.on("connect", () => {
    socket.emit(BuilderSocketEvent.SelectApp, { appId }, ({ users }: { users: UIUser[] }) => {
      userStore.init(users)
    })
  })
  socket.on("connect_error", (err) => {
    console.error("Failed to connect to builder websocket:", err.message)
  })
  socket.on("disconnect", () => {
    userStore.reset()
  })

  // User events
  socket.onOther(SocketEvent.UserUpdate, ({ user }: { user: UIUser }) => {
    userStore.updateUser(user)
  })
  socket.onOther(SocketEvent.UserDisconnect, ({ sessionId }: { sessionId: string }) => {
    userStore.removeUser(sessionId)
  })
  socket.onOther(BuilderSocketEvent.LockTransfer, ({ userId }: { userId: string }) => {
    if (userId === get(auth)?.user?._id) {
      appStore.update((state) => ({
        ...state,
        hasLock: true,
      }))
    }
  })

  // Data section events
  socket.onOther(BuilderSocketEvent.TableChange, ({ id, table }: { id: string; table: Table }) => {
    tables.replaceTable(id, table)
  })
  socket.onOther(
    BuilderSocketEvent.DatasourceChange,
    ({ id, datasource }: { id: string; datasource: Datasource }) => {
      datasources.replaceDatasource(id, datasource)
    }
  )

  // Role events
  socket.onOther(BuilderSocketEvent.RoleChange, ({ id, role }: { id: string; role: Role }) => {
    roles.replace(id, role)
  })

  // Design section events
  socket.onOther(
    BuilderSocketEvent.ScreenChange,
    ({ id, screen }: { id: string; screen: Screen }) => {
      screenStore.replace(id, screen)
    }
  )

  // App events
  socket.on(
    BuilderSocketEvent.WorkspaceAppChange,
    ({ id, workspaceApp }: { id: string; workspaceApp: WorkspaceApp }) => {
      workspaceAppStore.replaceDatasource(id, workspaceApp)
    }
  )

  socket.onOther(BuilderSocketEvent.AppMetadataChange, ({ metadata }: { metadata: any }) => {
    appStore.syncMetadata(metadata)
    themeStore.syncMetadata(metadata)
    navigationStore.syncMetadata(metadata)
    snippets.syncMetadata(metadata)
  })
  socket.onOther(
    BuilderSocketEvent.AppPublishChange,
    async ({ user, published }: { user: UIUser; published: boolean }) => {
      await appsStore.load()
      if (published) {
        await Promise.all([deploymentStore.load(), workspaceDeploymentStore.fetch()])
      }
      const verb = published ? "published" : "unpublished"
      notifications.success(`${helpers.getUserLabel(user)} ${verb} this app`)
    }
  )

  return socket
}
