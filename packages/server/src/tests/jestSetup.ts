// Startup refreshes every workspace's client files. Keep that background work out of
// integration tests; client library uploads are covered in their own test suite.
jest.mock("../utilities/fileSystem", () => ({
  ...jest.requireActual("../utilities/fileSystem"),
  updateClientLibrary: jest.fn(),
}))

// Fixtures can create independent workspaces without changing the ID used by
// the real onboarding endpoint.
jest.mock("../db/utils", () => {
  const actual = jest.requireActual("../db/utils")
  return { ...actual, generateWorkspaceID: jest.fn(actual.generateWorkspaceID) }
})

import { env as coreEnv, timers } from "@supertoolmake/backend-core"
import { testContainerUtils } from "@supertoolmake/backend-core/tests"
import * as matchers from "jest-extended"
import nock from "nock"
import env from "../environment"

expect.extend(matchers)
if (!process.env.CI) {
  // set a longer timeout in dev for debugging 100 seconds
  jest.setTimeout(100 * 1000)
} else {
  jest.setTimeout(30 * 1000)
}

nock.disableNetConnect()
nock.enableNetConnect((host) => {
  return host.includes("localhost") || host.includes("127.0.0.1") || host.includes("::1")
})

testContainerUtils.setupEnv(env, coreEnv)

afterAll(async () => {
  timers.cleanup()
})
