import {
  cache,
  env as coreEnv,
  installation,
  logging,
  tenancy,
  users,
} from "@budibase/backend-core"
import bson from "bson"
import fs from "fs"
import { Server } from "http"
import Koa from "koa"
import { AddressInfo } from "net"
import * as api from "../api"
import env from "../environment"
import { default as eventEmitter, init as eventInit } from "../events"
import * as jsRunner from "../jsRunner"
import sdk from "../sdk"
import * as fileSystem from "../utilities/fileSystem"
import * as redis from "../utilities/redis"
import { generateApiKey, getChecklist } from "../utilities/workerRequests"
import { initialise as initialiseWebsockets } from "../websockets"

export type State = "uninitialised" | "starting" | "ready"
let STATE: State = "uninitialised"

export function getState(): State {
  return STATE
}

async function initRoutes(app: Koa) {
  app.context.eventEmitter = eventEmitter
  app.context.auth = {}

  // api routes
  app.use(api.router.routes())
  app.use(api.router.allowedMethods())
}

export async function startup(
  opts: { app?: Koa; server?: Server; force?: boolean } = {}
) {
  const { app, server } = opts
  if (STATE !== "uninitialised" && !opts.force) {
    console.log("Budibase already started")
    return
  }
  STATE = "starting"
  if (env.BUDIBASE_ENVIRONMENT) {
    console.log(`service running environment: "${env.BUDIBASE_ENVIRONMENT}"`)
  }
  if (app && server && !env.CLUSTER_MODE) {
    console.log(`Budibase running on ${JSON.stringify(server.address())}`)
    const address = server.address() as AddressInfo
    env._set("PORT", address.port)
  }

  console.log("Emitting port event")
  eventEmitter.emitPort(env.PORT)

  console.log("Initialising file system")
  fileSystem.init()

  console.log("Initialising redis")
  await redis.init()

  console.log("Initialising writethrough cache")
  cache.docWritethrough.init()

  console.log("Initialising events")
  eventInit()

  if (app && server) {
    console.log("Initialising websockets")
    initialiseWebsockets(app, server)
  }

  // monitor plugin directory if required
  if (
    env.SELF_HOSTED &&
    !env.MULTI_TENANCY &&
    env.PLUGINS_DIR &&
    fs.existsSync(env.PLUGINS_DIR)
  ) {
    console.log("Monitoring plugin directory")
  }

  // check for version updates
  console.log("Checking for version updates")
  await installation.checkInstallVersion()

  console.log("Initialising queues")
  // get the references to the queue promises, don't await as
  // they will never end, unless the processing stops
  let queuePromises = []
  queuePromises.push(sdk.dev.init())
  if (app) {
    console.log("Initialising routes")
    // bring routes online as final step once everything ready
    await initRoutes(app)
  }

  // check and create admin user if required
  // this must be run after the api has been initialised due to
  // the app user sync
  const bbAdminEmail = coreEnv.BB_ADMIN_USER_EMAIL,
    bbAdminPassword = coreEnv.BB_ADMIN_USER_PASSWORD
  if (
    env.SELF_HOSTED &&
    !env.MULTI_TENANCY &&
    bbAdminEmail &&
    bbAdminPassword
  ) {
    console.log("Initialising admin user")
    const tenantId = tenancy.getTenantId()
    await tenancy.doInTenant(tenantId, async () => {
      const exists = await users.doesUserExist(bbAdminEmail)
      const checklist = await getChecklist()
      if (!checklist?.adminUser?.checked || !exists) {
        try {
          const user = await users.UserDB.createAdminUser(
            bbAdminEmail,
            tenantId,
            {
              password: bbAdminPassword,
              hashPassword: true,
              requirePassword: true,
              skipPasswordValidation: true,
            }
          )
          // Need to set up an API key for automated integration tests
          if (env.isTest()) {
            await generateApiKey(user._id!)
          }

          console.log("Admin account automatically created for", bbAdminEmail)
        } catch (e) {
          logging.logAlert("Error creating initial admin user. Exiting.", e)
          throw e
        }
      }
    })
  }

  if (coreEnv.BSON_BUFFER_SIZE) {
    bson.setInternalBufferSize(coreEnv.BSON_BUFFER_SIZE)
  }

  console.log("Initialising JS runner")
  jsRunner.init()

  STATE = "ready"
}
