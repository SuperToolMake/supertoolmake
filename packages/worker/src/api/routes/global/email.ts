import { auth } from "@supertoolmake/backend-core"
import { EmailTemplatePurpose } from "@supertoolmake/types"
import { z } from "zod"
import * as controller from "../../controllers/global/email"
import { adminRoutes } from "../endpointGroups"

function buildEmailSendValidation() {
  // prettier-ignore
  const emailList = z
    .string()
    .refine(
      (value) => value.split(",").every((email) => z.email().safeParse(email.trim()).success),
      "Invalid email address"
    )
  return auth.zodValidator.body(
    z.looseObject({
      email: emailList.optional(),
      cc: emailList.nullish().or(z.literal("")),
      bcc: emailList.nullish().or(z.literal("")),
      purpose: z.enum(EmailTemplatePurpose).optional(),
      workspaceId: z.string().nullish().or(z.literal("")),
      from: z.string().nullish().or(z.literal("")),
      contents: z.string().nullish().or(z.literal("")),
      subject: z.string().nullish().or(z.literal("")),
    })
  )
}

adminRoutes.post("/api/global/email/send", buildEmailSendValidation(), controller.sendEmail)
