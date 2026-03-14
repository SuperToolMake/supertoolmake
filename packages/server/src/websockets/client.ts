import { permissions } from "@budibase/backend-core"
import type http from "http"
import type Koa from "koa"
import { authorizedMiddleware as authorized } from "../middleware/authorized"
import { BaseSocket } from "./websocket"

export default class ClientAppWebsocket extends BaseSocket {
  constructor(app: Koa, server: http.Server) {
    super(app, server, "/socket/client", [authorized(permissions.BUILDER)])
  }
}
