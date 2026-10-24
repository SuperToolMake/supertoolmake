import type { Database, IdentityContext, Snippet, Table, Workspace } from "@supertoolmake/types"
import { DEFAULT_TENANT_ID, DocumentType, SEPARATOR, StaticDatabases } from "../constants"
import { getDB } from "../db/db"
import * as conversions from "../docIds/conversions"
import env from "../environment"
import Context from "./Context"
import type { ContextMap } from "./types"

export function getGlobalDBName(tenantId?: string) {
  // tenant ID can be set externally, for example user API where
  // new tenants are being created, this may be the case
  if (!tenantId) {
    tenantId = getTenantId()
  }
  return baseGlobalDBName(tenantId)
}

export function getAuditLogDBName(tenantId?: string) {
  if (!tenantId) {
    tenantId = getTenantId()
  }
  if (tenantId === DEFAULT_TENANT_ID) {
    return StaticDatabases.AUDIT_LOGS.name
  } else {
    return `${tenantId}${SEPARATOR}${StaticDatabases.AUDIT_LOGS.name}`
  }
}

export function getScimDBName(tenantId?: string) {
  if (!tenantId) {
    tenantId = getTenantId()
  }
  if (tenantId === DEFAULT_TENANT_ID) {
    return StaticDatabases.SCIM_LOGS.name
  } else {
    return `${tenantId}${SEPARATOR}${StaticDatabases.SCIM_LOGS.name}`
  }
}

export function baseGlobalDBName(tenantId: string | undefined | null) {
  if (!tenantId || tenantId === DEFAULT_TENANT_ID) {
    return StaticDatabases.GLOBAL.name
  } else {
    return `${tenantId}${SEPARATOR}${StaticDatabases.GLOBAL.name}`
  }
}

export function getPlatformURL() {
  return env.PLATFORM_URL
}

export function isTenantIdSet() {
  const context = Context.get()
  return Boolean(context?.tenantId)
}

/**
 * Given a workspace ID this will attempt to retrieve the tenant ID from it.
 * @return The tenant ID found within the workspace ID.
 */
export function getTenantIDFromWorkspaceID(workspaceId: string) {
  if (!workspaceId) {
    return
  }
  return DEFAULT_TENANT_ID
}

function updateContext(updates: ContextMap): ContextMap {
  let context: ContextMap
  try {
    context = Context.get()
  } catch {
    // no context, start empty
    context = {}
  }
  context = {
    ...context,
    ...updates,
  }
  return context
}

async function newContext<T>(updates: ContextMap, task: () => T) {
  guardMigration()

  // see if there already is a context setup
  const context: ContextMap = updateContext(updates)
  return Context.run(context, task)
}

export async function doInContext(workspaceId: string, task: any): Promise<any> {
  const tenantId = getTenantIDFromWorkspaceID(workspaceId)
  return newContext(
    {
      tenantId,
      appId: workspaceId,
    },
    task
  )
}

export async function doInTenant<T>(tenantId: string | undefined, task: () => T): Promise<T> {
  // make sure default always selected in single tenancy
  tenantId = tenantId || DEFAULT_TENANT_ID

  const updates = tenantId ? { tenantId } : {}
  return newContext(updates, task)
}

export async function doInWorkspaceContext<T>(workspaceId: string, task: () => T): Promise<T> {
  return _doInWorkspaceContext(workspaceId, task)
}

async function _doInWorkspaceContext<T>(
  workspaceId: string,
  task: () => T,
  extraContextSettings?: ContextMap
): Promise<T> {
  if (!workspaceId) {
    throw new Error("workspaceId is required")
  }

  const tenantId = getTenantIDFromWorkspaceID(workspaceId)
  const updates: ContextMap = { appId: workspaceId, ...extraContextSettings }
  if (tenantId) {
    updates.tenantId = tenantId
  }

  return newContext(updates, task)
}

export async function doInIdentityContext<T>(identity: IdentityContext, task: () => T): Promise<T> {
  if (!identity) {
    throw new Error("identity is required")
  }

  const context: ContextMap = {
    identity,
  }
  if (identity.tenantId) {
    context.tenantId = identity.tenantId
  }
  return newContext(context, task)
}

function guardMigration() {
  const context = Context.get()
  if (context?.isMigrating) {
    throw new Error("The context cannot be changed, a migration is currently running")
  }
}

export async function doInWorkspaceMigrationContext<T>(
  workspaceId: string,
  task: () => T
): Promise<T> {
  return _doInWorkspaceContext(workspaceId, task, {
    isMigrating: true,
  })
}

export function getIdentity(): IdentityContext | undefined {
  try {
    const context = Context.get()
    return context?.identity
  } catch {
    // do nothing - identity is not in context
  }
}

export function getTenantId(): string {
  return DEFAULT_TENANT_ID
}

export function getAutomationId(): string | undefined {
  const context = Context.get()
  return context?.automationId
}

export function getWorkspaceId(): string | undefined {
  const context = Context.get()
  return context?.appId
}

export function getIP(): string | undefined {
  const context = Context.get()
  return context?.ip
}

export const getDevWorkspaceId = () => {
  const workspaceId = getWorkspaceId()
  if (!workspaceId) {
    throw new Error("Could not get workspaceId")
  }
  return conversions.getDevWorkspaceID(workspaceId)
}

export const getProdWorkspaceId = () => {
  const workspaceId = getWorkspaceId()
  if (!workspaceId) {
    throw new Error("Could not get workspaceId")
  }
  return conversions.getProdWorkspaceID(workspaceId)
}

export function doInEnvironmentContext<T>(values: Record<string, string>, task: () => T) {
  if (!values) {
    throw new Error("Must supply environment variables.")
  }
  const updates = {
    environmentVariables: values,
  }
  return newContext(updates, task)
}

export function doInScimContext(task: any) {
  const updates: ContextMap = {
    isScim: true,
  }
  return newContext(updates, task)
}

export function doInIPContext(ip: string, task: any) {
  return newContext({ ip }, task)
}

export async function ensureSnippetContext() {
  const ctx = getCurrentContext()

  // If we've already added snippets to context, continue
  if (!ctx || ctx.snippets) {
    return
  }

  // Otherwise get snippets for this workspace and update context
  let snippets: Snippet[] | undefined
  const db = getWorkspaceDB()
  if (db) {
    const workspace = await db.tryGet<Workspace>(DocumentType.WORKSPACE_METADATA)
    snippets = workspace?.snippets
  }

  // Always set snippets to a non-null value so that we can tell we've attempted
  // to load snippets
  ctx.snippets = snippets || []
}

export function getEnvironmentVariables() {
  const context = Context.get()
  if (!context.environmentVariables) {
    return null
  } else {
    return context.environmentVariables
  }
}

export function getGlobalDB(): Database {
  const context = Context.get()
  if (!context) {
    throw new Error("Global DB not found")
  }
  return getDB(baseGlobalDBName(context?.tenantId))
}

export function getAuditLogsDB(): Database {
  if (!getTenantId()) {
    throw new Error("No tenant ID found - cannot open audit log DB")
  }
  return getDB(getAuditLogDBName())
}

/**
 * Gets the workspace database based on whatever the request
 * contained, dev or prod.
 */
export function getWorkspaceDB(opts?: any): Database {
  const workspaceId = getWorkspaceId()
  if (!workspaceId) {
    throw new Error("Unable to retrieve workspace DB - no workspace ID.")
  }
  return getDB(workspaceId, opts)
}

/**
 * This specifically gets the prod workspace ID, if the request
 * contained a development workspace ID, this will get the prod one.
 */
export function getProdWorkspaceDB(opts?: any): Database {
  const workspaceId = getWorkspaceId()
  if (!workspaceId) {
    throw new Error("Unable to retrieve prod DB - no workspace ID.")
  }
  return getDB(conversions.getProdWorkspaceID(workspaceId), opts)
}

/**
 * This specifically gets the dev workspace ID, if the request
 * contained a prod workspace ID, this will get the dev one.
 */
export function getDevWorkspaceDB(opts?: any): Database {
  const workspaceId = getWorkspaceId()
  if (!workspaceId) {
    throw new Error("Unable to retrieve dev DB - no workspace ID.")
  }
  return getDB(conversions.getDevWorkspaceID(workspaceId), opts)
}

export function isScim(): boolean {
  const context = Context.get()
  const scimCall = context?.isScim
  return Boolean(scimCall)
}

export function getCurrentContext(): ContextMap | undefined {
  try {
    return Context.get()
  } catch {
    return
  }
}

export function getTableForView(viewId: string): Table | undefined {
  const context = getCurrentContext()
  if (!context) {
    return
  }
  return context.viewToTableCache?.[viewId]
}

export function setTableForView(viewId: string, table: Table) {
  const context = getCurrentContext()
  if (!context) {
    return
  }
  context.viewToTableCache ??= {}
  context.viewToTableCache[viewId] = table
}
