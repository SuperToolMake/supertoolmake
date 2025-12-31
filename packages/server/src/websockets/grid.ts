import { auth, permissions } from "@budibase/backend-core"
import { GridSocketEvent } from "@budibase/shared-core"
import { Ctx, Row, Table, WorkspaceApp } from "@budibase/types"
import http from "http"
import Koa from "koa"
import { userAgent } from "koa-useragent"
import { Socket } from "socket.io"
import { getSourceId } from "../api/controllers/row/utils"
import { authorizedMiddleware as authorized } from "../middleware/authorized"
import { currentWorkspaceMiddleware as currentWorkspace } from "../middleware/currentWorkspace"
import { createContext, runMiddlewares } from "./middleware"
import { BaseSocket } from "./websocket"

const { PermissionType, PermissionLevel } = permissions

export default class GridSocket extends BaseSocket {
  constructor(app: Koa, server: http.Server) {
    super(app, server, "/socket/grid")
  }

  async onConnect(socket: Socket) {
    // Initial identification of connected spreadsheet
    socket.on(GridSocketEvent.SelectDatasource, async (payload, callback) => {
      const ds = payload.datasource
      const appId = payload.appId
      const resourceId = ds?.type === "table" ? ds?.tableId : ds?.id
      let valid = true

      // Validate datasource
      if (!resourceId || !appId) {
        // Ignore if no table or app specified
        valid = false
      }
      if (!valid) {
        socket.disconnect(true)
        return
      }

      // Create context
      const ctx = createContext(this.app, socket, {
        resourceId,
        appId,
      })

      // Construct full middleware chain to assess permissions
      const middlewares = [
        userAgent,
        auth.buildAuthMiddleware([], {
          publicAllowed: true,
        }),
        currentWorkspace,
        authorized(PermissionType.TABLE, PermissionLevel.READ),
      ]

      // Run all koa middlewares
      try {
        await runMiddlewares(ctx, middlewares, async () => {
          // Middlewares are finished and we have permission
          // Join room for this resource
          const room = `${appId}-${resourceId}`
          await this.joinRoom(socket, room)

          // Reply with all users in current room
          const sessions = await this.getRoomSessions(room)
          callback({ users: sessions })
        })
      } catch (error) {
        socket.disconnect(true)
      }
    })

    // Handle users selecting a new cell
    socket.on(GridSocketEvent.SelectCell, ({ cellId }) => {
      this.updateUser(socket, { focusedCellId: cellId })
    })
  }

  async updateUser(socket: Socket, patch: object) {
    await super.updateUser(socket, {
      gridMetadata: {
        ...socket.data.gridMetadata,
        ...patch,
      },
    })
  }

  emitRowUpdate(ctx: Ctx, row: Row) {
    const source = getSourceId(ctx)
    const resourceId = source.viewId ?? source.tableId
    const room = `${ctx.appId}-${resourceId}`
    this.emitToRoom(ctx, room, GridSocketEvent.RowChange, {
      id: row._id,
      row,
    })
  }

  emitRowDeletion(ctx: Ctx, row: Row) {
    const source = getSourceId(ctx)
    const resourceId = source.viewId ?? source.tableId
    const room = `${ctx.appId}-${resourceId}`
    this.emitToRoom(ctx, room, GridSocketEvent.RowChange, {
      id: row._id,
      row: null,
    })
  }

  emitWorkspaceAppUpdate(ctx: Ctx, workspaceApp: WorkspaceApp) {
    const room = `${ctx.appId}-${workspaceApp._id}`
    this.emitToRoom(ctx, room, GridSocketEvent.WorkspaceAppChange, {
      id: workspaceApp._id,
      workspaceApp,
    })
  }

  emitTableUpdate(ctx: Ctx, table: Table) {
    const room = `${ctx.appId}-${table._id}`
    this.emitToRoom(ctx, room, GridSocketEvent.DatasourceChange, {
      id: table._id,
      datasource: table,
    })
  }

  emitTableDeletion(ctx: Ctx, table: Table) {
    const room = `${ctx.appId}-${table._id}`
    this.emitToRoom(ctx, room, GridSocketEvent.DatasourceChange, {
      id: table._id,
      datasource: null,
    })
  }
}
