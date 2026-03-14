import type supertest from "supertest"
import TestConfiguration from "../../../../tests/utilities/TestConfiguration"

export * as structures from "../../../../tests/utilities/structures"

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let request: supertest.SuperTest<supertest.Test> | undefined | null,
  config: TestConfiguration | null

export function beforeAll() {
  config = new TestConfiguration()
  request = config.getRequest()
}

export function afterAll() {
  if (config) {
    config.end()
  }
  // clear app files

  request = null
  config = null
}

export function getRequest() {
  if (!request) {
    beforeAll()
  }
  return request!
}

export function getConfig() {
  if (!config) {
    beforeAll()
  }
  return config!
}
