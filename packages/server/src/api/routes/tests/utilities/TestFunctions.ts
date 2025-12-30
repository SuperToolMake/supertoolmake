import { context, db, roles, tenancy } from "@budibase/backend-core"
import env from "../../../../environment"
import TestConfiguration from "../../../../tests/utilities/TestConfiguration"
import * as rowController from "../../../controllers/row"

class Request {
  appId: any
  params: any
  request: any
  body: any

  constructor(appId: any, params: any) {
    this.appId = appId
    this.params = params
    this.request = {}
  }
}

function runRequest(appId: any, controlFunc: any, request?: any) {
  return context.doInWorkspaceContext(appId, async () => {
    return controlFunc(request)
  })
}

export const getAllTableRows = async (config: TestConfiguration) => {
  const req = new Request(config.getDevWorkspaceId(), {
    tableId: config.table!._id,
  })
  await runRequest(config.getDevWorkspaceId(), rowController.fetch, req)
  return req.body
}

export const createRequest = (
  request: any,
  method: any,
  url: any,
  body: any
) => {
  let req

  if (method === "POST") req = request.post(url).send(body)
  else if (method === "GET") req = request.get(url)
  else if (method === "DELETE") req = request.delete(url)
  else if (method === "PATCH") req = request.patch(url).send(body)
  else if (method === "PUT") req = request.put(url).send(body)

  return req
}

export const checkBuilderEndpoint = async ({
  config,
  method,
  url,
  body,
}: {
  config: TestConfiguration
  method: string
  url: string
  body?: any
}) => {
  const headers = await config.login({
    userId: "us_fail",
    builder: false,
    prodApp: true,
  })
  await exports
    .createRequest(config.request, method, url, body)
    .set(headers)
    .expect(403)
}

export const checkPermissionsEndpoint = async ({
  config,
  method,
  url,
  body,
  passRole,
  failRole,
}: any) => {
  const passHeader = await config.login({
    roleId: passRole,
    prodApp: true,
  })

  await exports
    .createRequest(config.request, method, url, body)
    .set(passHeader)
    .expect(200)

  let failHeader
  if (failRole === roles.BUILTIN_ROLE_IDS.PUBLIC) {
    failHeader = config.publicHeaders({ prodApp: true })
  } else {
    failHeader = await config.login({
      roleId: failRole,
      builder: false,
      prodApp: true,
    })
  }

  await exports
    .createRequest(config.request, method, url, body)
    .set(failHeader)
    .expect(401)
}

export const getDB = () => {
  return context.getWorkspaceDB()
}

export const testAutomation = async (
  config: any,
  automation: any,
  triggerInputs: any
) => {
  return runRequest(automation.appId, async () => {
    return await config.request
      .post(`/api/automations/${automation._id}/test`)
      .send({
        ...triggerInputs,
      })
      .set(config.defaultHeaders())
      .expect("Content-Type", /json/)
      .expect(200)
  })
}

export const runInProd = async (func: any) => {
  const nodeEnv = env.NODE_ENV
  const workerId = env.JEST_WORKER_ID
  env._set("NODE_ENV", "PRODUCTION")
  env._set("JEST_WORKER_ID", null)
  await func()
  env._set("NODE_ENV", nodeEnv)
  env._set("JEST_WORKER_ID", workerId)
}

export function allowUndefined(expectation: jest.Expect) {
  return expect.toBeOneOf([expectation, undefined, null])
}
