import type { Hosting } from ".."

export enum IdentityType {
  USER = "user",
  TENANT = "tenant",
  INSTALLATION = "installation",
}

export interface HostInfo {
  ipAddress?: string
  userAgent?: string
}

export interface Identity {
  id: string
  type: IdentityType
  hosting: Hosting
  environment: string
  installationId?: string
  tenantId?: string
  realTenantId?: string
  hostInfo?: HostInfo
}

export type TableExportFormat = "json" | "csv"
