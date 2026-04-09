import * as db from "./db"

db.init()

import { env as coreEnv } from "@supertoolmake/backend-core"
import { ServiceType } from "@supertoolmake/types"

coreEnv._set("SERVICE_TYPE", ServiceType.APPS)

import type { Server } from "node:http"
import type Koa from "koa"
import createKoaApp from "./koa"
import { startup } from "./startup"

let app: Koa, server: Server

async function start() {
  const koa = createKoaApp()
  app = koa.app
  server = koa.server
  try {
    await startup({ app, server })
  } catch (err: any) {
    console.error(`Failed server startup - ${err.message}`)
    process.exit(1)
  }
}

start()

export function getServer(): Server {
  return server
}
