import { auth } from "@supertoolmake/backend-core"
import { z } from "zod"
import * as controller from "../../controllers/global/users"
import {
  adminRoutes,
  builderOrAdminRoutes,
  cloudRestrictedRoutes,
  loggedInRoutes,
} from "../endpointGroups"
import { users } from "../validation"

const OPTIONAL_STRING = z.string().nullish().or(z.literal(""))

function buildAdminInitValidation() {
  return auth.zodValidator.body(
    z.strictObject({
      email: z.string(),
      password: OPTIONAL_STRING,
      tenantId: z.string(),
      ssoId: z.string().optional(),
      familyName: OPTIONAL_STRING,
      givenName: OPTIONAL_STRING,
    })
  )
}

function buildInviteValidation() {
  // prettier-ignore
  return auth.zodValidator.body(
    z.strictObject({
      email: z.string(),
      userInfo: z.looseObject({}).optional(),
    })
  )
}

function buildInviteMultipleValidation() {
  // prettier-ignore
  return auth.zodValidator.body(
    z.array(
      z.strictObject({
        email: z.string().optional(),
        userInfo: z.looseObject({}).optional(),
      })
    )
  )
}

function buildInviteAcceptValidation() {
  // prettier-ignore
  return auth.zodValidator.body(
    z.looseObject({
      inviteCode: z.string(),
      password: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      tenantId: z.string().optional(),
    })
  )
}

function buildChangeTenantOwnerEmailValidation() {
  return auth.zodValidator.body(
    z.strictObject({
      newAccountEmail: z.string(),
      originalEmail: z.string(),
      tenantIds: z.array(z.string()),
    })
  )
}

cloudRestrictedRoutes
  .post("/api/global/users/sso", users.buildAddSsoSupport(), controller.addSsoSupport)
  .post("/api/global/users/init", buildAdminInitValidation(), controller.adminUser)
  .put(
    "/api/global/users/tenant/owner",
    buildChangeTenantOwnerEmailValidation(),
    controller.changeTenantOwnerEmail
  )

adminRoutes
  .post("/api/global/users/bulk", users.buildUserBulkUserValidation(), controller.bulkUpdate)
  .delete("/api/global/users/:id", controller.destroy)

builderOrAdminRoutes
  .get("/api/global/users", controller.fetch)
  .get("/api/global/users/count/:appId", controller.countByApp)
  .get("/api/global/users/invites", controller.getUserInvites)
  .get("/api/global/users/:id", controller.find)
  .post("/api/global/users/invite/:code/:role", controller.addWorkspaceIdToInvite)
  .delete("/api/global/users/invite/:code", controller.removeWorkspaceIdFromInvite)
  .post("/api/global/users/:userId/permission/:role", controller.addUserToWorkspace)
  .delete("/api/global/users/:userId/permission", controller.removeUserFromWorkspace)

adminRoutes
  .post("/api/global/users/invite", buildInviteValidation(), controller.invite)
  .post(
    "/api/global/users/multi/invite",
    buildInviteMultipleValidation(),
    controller.inviteMultiple
  )
  .post("/api/global/users/multi/invite/delete", controller.removeMultipleInvites)
  .post("/api/global/users", users.buildUserSaveValidation(), controller.save)

loggedInRoutes
  // search can be used by any user now, to retrieve users for user column
  .post("/api/global/users/search", controller.search)
  // non-global endpoints
  .get("/api/global/users/invite/:code", controller.checkInvite)
  .post("/api/global/users/invite/accept", buildInviteAcceptValidation(), controller.inviteAccept)
  .get("/api/global/users/tenant/:id", controller.tenantUserLookup)
