import { middleware } from "@supertoolmake/backend-core"
import { z } from "zod"
import * as controller from "../controllers/ops"
import { publicRoutes } from "./endpointGroups"

export function logsValidator() {
  return middleware.zodValidator.body(
    z.strictObject({
      message: z.string(),
      data: z.looseObject({}).optional(),
    })
  )
}

export function errorValidator() {
  return middleware.zodValidator.body(
    z.strictObject({
      message: z.string(),
    })
  )
}

publicRoutes
  .post("/api/ops/log", logsValidator(), controller.log)
  .post("/api/ops/error", errorValidator(), controller.error)
  .post("/api/ops/alert", errorValidator(), controller.alert)
