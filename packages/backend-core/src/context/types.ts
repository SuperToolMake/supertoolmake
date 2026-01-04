import { IdentityContext, Snippet, Table, VM } from "@budibase/types"

// keep this out of Budibase types, don't want to expose context info
export type ContextMap = {
  tenantId?: string
  isSelfHostUsingCloud?: boolean
  appId?: string
  identity?: IdentityContext
  environmentVariables?: Record<string, string>
  isScim?: boolean
  ip?: string
  automationId?: string
  isMigrating?: boolean
  vm?: VM
  cleanup?: (() => void | Promise<void>)[]
  snippets?: Snippet[]
  viewToTableCache?: Record<string, Table>
}
