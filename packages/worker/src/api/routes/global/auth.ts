import { auth } from "@supertoolmake/backend-core"
import { z } from "zod"
import { emailLockout, ipLockout } from "../../../middleware"
import * as authController from "../../controllers/global/auth"
import { loggedInRoutes } from "../endpointGroups"

function buildAuthValidation() {
  // prettier-ignore
  return auth.zodValidator.body(
    z.strictObject({
      username: z.string(),
      password: z.string(),
    })
  )
}

function buildResetValidation() {
  // prettier-ignore
  return auth.zodValidator.body(
    z.strictObject({
      email: z.string(),
    })
  )
}

function buildResetUpdateValidation() {
  // prettier-ignore
  return auth.zodValidator.body(
    z.strictObject({
      resetCode: z.string(),
      password: z.string(),
    })
  )
}

loggedInRoutes
  // PASSWORD
  .post(
    "/api/global/auth/:tenantId/login",
    buildAuthValidation(),
    ipLockout,
    emailLockout,
    authController.login
  )
  .post("/api/global/auth/logout", authController.logout)
  .post("/api/global/auth/:tenantId/reset", buildResetValidation(), authController.reset)
  .post(
    "/api/global/auth/:tenantId/reset/update",
    buildResetUpdateValidation(),
    authController.resetUpdate
  )
  // INIT
  .post("/api/global/auth/init", authController.setInitInfo)
  .get("/api/global/auth/init", authController.getInitInfo)

  // DATASOURCE - MULTI TENANT
  .get("/api/global/auth/:tenantId/datasource/:provider", authController.datasourcePreAuth)
  .get("/api/global/auth/:tenantId/datasource/:provider/callback", authController.datasourceAuth)

  // DATASOURCE - SINGLE TENANT - DEPRECATED
  .get("/api/global/auth/datasource/:provider/callback", authController.datasourceAuth)

  // GOOGLE - MULTI TENANT
  .get("/api/global/auth/:tenantId/google", authController.googlePreAuth)
  .get("/api/global/auth/:tenantId/google/callback", authController.googleCallback)

  // GOOGLE - SINGLE TENANT - DEPRECATED
  .get("/api/global/auth/google/callback", authController.googleCallback)
  .get("/api/admin/auth/google/callback", authController.googleCallback)

  // OIDC - MULTI TENANT
  .get("/api/global/auth/:tenantId/oidc/configs/:configId", authController.oidcPreAuth)
  .get("/api/global/auth/:tenantId/oidc/callback", authController.oidcCallback)

  // OIDC - SINGLE TENANT - DEPRECATED
  .get("/api/global/auth/oidc/callback", authController.oidcCallback)
  .get("/api/admin/auth/oidc/callback", authController.oidcCallback)
