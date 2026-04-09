import type { PublishStatusResponse } from "@supertoolmake/types"
import { type Expectations, TestAPI } from "./base"

export class DeployAPI extends TestAPI {
  publishStatus = async (expectations?: Expectations) => {
    return await this._get<PublishStatusResponse>("/api/deploy/status", {
      expectations,
    })
  }
}
