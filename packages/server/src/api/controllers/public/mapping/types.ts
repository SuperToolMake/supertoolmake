export interface Query {
  _id: string
  datasourceId?: string
  parameters?: string[]
  fields?: Record<string, unknown>
  queryVerb?: "create" | "read" | "update" | "delete"
  name: string
  schema: Record<string, unknown>
  transformer?: string
  readable?: boolean
}

export interface ExecuteQuery {
  data: Record<string, unknown>[]
  pagination?: Record<string, unknown>
  extra?: {
    raw?: string
    headers?: Record<string, unknown>
  }
}

export interface Application {
  name: string
  url: string
  _id: string
  status: "development" | "published"
  createdAt: string
  updatedAt: string
  version: string
  tenantId?: string
  lockedBy?: Record<string, unknown>
}

export interface CreateApplicationParams {
  name: string
  url?: string
}

export interface Table {
  _id: string
  name: string
  schema: Record<string, unknown>
  primaryDisplay?: string
}

export interface CreateTableParams {
  name: string
  primaryDisplay?: string
  schema: Record<string, unknown>
}

export interface View {
  _id: string
  name: string
  tableId: string
  [key: string]: unknown
}

export interface CreateViewParams {
  name: string
  tableId: string
  [key: string]: unknown
}

export type Row = { _id: string; tableId: string } & Record<string, unknown>

export interface RowSearch {
  data: Record<string, unknown>[]
  bookmark?: string | number
  hasNextPage?: boolean
}

export type CreateRowParams = Record<string, unknown>

export interface User {
  _id: string
  email: string
  password?: string
  status?: "active"
  firstName?: string
  lastName?: string
  forceResetPassword?: boolean
  builder?: { global?: boolean }
  admin?: { global?: boolean }
  roles?: Record<string, string>
}

export interface CreateUserParams {
  email: string
  password?: string
  status?: "active"
  firstName?: string
  lastName?: string
  forceResetPassword?: boolean
  builder?: { global?: boolean }
  admin?: { global?: boolean }
  roles?: Record<string, string>
}

export interface RoleAssignRequest {
  appBuilder?: { appId: string }
  builder?: boolean
  admin?: boolean
  role?: { roleId: string; appId: string }
  userIds: string[]
}

export type RoleUnAssignRequest = RoleAssignRequest

export interface RoleAssignmentResponse {
  data: { userIds: string[] }
}

export type SearchInputParams = { name: string } | Record<string, unknown>
