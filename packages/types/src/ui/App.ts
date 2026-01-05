export interface AppProps {
  title: string
  favicon: string
  metaImage: string
  metaTitle: string
  metaDescription: string
  clientCacheKey?: string
  workspaceId: string
  appMigrating?: boolean
  showSkeletonLoader?: boolean
  hideDevTools?: boolean
  sideNav?: boolean
  hideFooter?: boolean
  nonce?: string
  headAppScripts?: string
  bodyAppScripts?: string
}
