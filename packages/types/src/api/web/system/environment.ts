export interface GetEnvironmentResponse {
  offlineMode: boolean
  baseUrl?: string
  isDev: boolean
  maintenance: { type: string }[]
  passwordMinLength?: string
}
