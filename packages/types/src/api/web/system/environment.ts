export interface GetEnvironmentResponse {
  offlineMode: boolean
  cloud: boolean
  baseUrl?: string
  isDev: boolean
  maintenance: { type: string }[]
  passwordMinLength?: string
}
