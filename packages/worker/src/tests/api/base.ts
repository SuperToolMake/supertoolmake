import type { Agent } from "supertest"
import type TestConfiguration from "../TestConfiguration"

export interface TestAPIOpts {
  headers?: any
  status?: number
}

export abstract class TestAPI {
  config: TestConfiguration
  request: Agent

  constructor(config: TestConfiguration) {
    this.config = config
    this.request = config.request
  }
}
