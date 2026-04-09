import { tenancy } from "@supertoolmake/backend-core"
import type { SendEmailRequest, SendEmailResponse, User, UserCtx } from "@supertoolmake/types"
import { sendEmail as sendEmailFn } from "../../../utilities/email"

export async function sendEmail(ctx: UserCtx<SendEmailRequest, SendEmailResponse>) {
  const {
    email,
    userId,
    purpose,
    contents,
    from,
    subject,
    cc,
    bcc,
    automation,
    invite,
    attachments,
  } = ctx.request.body
  let user: User | undefined
  if (userId) {
    const db = tenancy.getGlobalDB()
    user = await db.tryGet<User>(userId)
    if (!user) {
      ctx.throw(404, "User not found.")
    }
  }
  const response = await sendEmailFn(email, purpose, {
    user,
    contents,
    from,
    subject,
    cc,
    bcc,
    automation,
    invite,
    attachments,
  })
  ctx.body = {
    ...response,
    message: `Email sent to ${email}.`,
  }
}
