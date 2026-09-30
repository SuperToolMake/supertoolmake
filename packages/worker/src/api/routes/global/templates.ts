import { auth as authCore } from "@supertoolmake/backend-core"
import { z } from "zod"
import { TemplatePurpose, TemplateType } from "../../../constants"
import * as controller from "../../controllers/global/templates"
import { adminRoutes, loggedInRoutes } from "../endpointGroups"

const { zodValidator } = authCore

function buildTemplateSaveValidation() {
  // prettier-ignore
  return zodValidator.body(
    z.looseObject({
      _id: z.string().nullish().or(z.literal("")),
      _rev: z.string().nullish().or(z.literal("")),
      ownerId: z.string().nullish().or(z.literal("")),
      name: z.string().nullish().or(z.literal("")),
      contents: z.string(),
      purpose: z.enum(TemplatePurpose),
      type: z.enum(TemplateType),
    })
  )
}

loggedInRoutes
  .get("/api/global/template/definitions", controller.definitions)
  .get("/api/global/template", controller.fetch)
  .get("/api/global/template/:type", controller.fetchByType)
  .get("/api/global/template/:ownerId", controller.fetchByOwner)
  .get("/api/global/template/:id", controller.find)
  .post("/api/global/template/:type/export", controller.exportTemplates)

adminRoutes
  .post("/api/global/template", buildTemplateSaveValidation(), controller.save)
  .delete("/api/global/template/:id/:rev", controller.destroy)
