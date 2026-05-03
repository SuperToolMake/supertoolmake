import { randomUUID as uuid } from "node:crypto"
import { Header } from "../../constants"

const correlator = require("correlation-id")

export const correlationMiddleware = (ctx: any, next: any) => {
  // use the provided correlation id header if present
  let correlationId = ctx.headers[Header.CORRELATION_ID]
  if (!correlationId) {
    correlationId = uuid()
  }

  return correlator.withId(correlationId, () => {
    return next()
  })
}
