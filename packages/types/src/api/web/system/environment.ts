export interface GetEnvironmentResponse {
  multiTenancy: boolean
  offlineMode: boolean
  cloud: boolean
  baseUrl?: string
  isDev: boolean
  maintenance: { type: string }[]
  passwordMinLength?: string
}
