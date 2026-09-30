import type SMTPTransport from "nodemailer/lib/smtp-transport"

export interface EmailInvite {
  startTime: Date
  endTime: Date
  summary: string
  location?: string
  url?: string
}

export interface EmailAttachment {
  url: string
  filename: string
}

export enum EmailTemplatePurpose {
  CORE = "core",
  BASE = "base",
  PASSWORD_RECOVERY = "password_recovery",
  INVITATION = "invitation",
  WELCOME = "welcome",
  CUSTOM = "custom",
}

export interface SendEmailRequest {
  email: string
  userId?: string
  purpose: EmailTemplatePurpose
  contents?: string
  from?: string
  subject: string
  cc?: string
  bcc?: string
  automation?: boolean
  invite?: EmailInvite
  attachments?: EmailAttachment[]
}
export interface SendEmailResponse
  extends Omit<
    SMTPTransport.SentMessageInfo,
    "pending" | "response" | "envelopeTime" | "messageTime" | "messageSize"
  > {
  pending: SMTPTransport.SentMessageInfo["pending"]
  response?: SMTPTransport.SentMessageInfo["response"]
  envelopeTime?: number
  messageTime?: number
  messageSize?: number
  message: string
}
