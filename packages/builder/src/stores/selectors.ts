import { DatasourceFeature, type Integration } from "@supertoolmake/types"
import { cloneDeep } from "lodash/fp"

interface Datasource {
  source?: string
}

interface Tables {
  list: unknown[]
}

export const integrationForDatasource = (
  integrations: Record<string, Integration>,
  datasource: Datasource | undefined
): Integration | null => {
  if (!datasource?.source) return null
  return {
    name: datasource.source,
    ...integrations[datasource.source],
  } as Integration
}

export const hasData = (datasourceList: Datasource[], tables: Tables): boolean =>
  datasourceList.length > 0 || tables.list.length > 1

interface DatasourceFieldProperties {
  type: string
  default?: unknown
  fields?: Record<string, DatasourceFieldProperties>
}

export const configFromIntegration = (
  integration: Integration | undefined
): Record<string, unknown> => {
  const config: Record<string, unknown> = {}

  Object.entries(integration?.datasource || {}).forEach(([key, properties]) => {
    const typedProperties = properties as DatasourceFieldProperties
    if (typedProperties.type === "fieldGroup") {
      Object.keys(typedProperties.fields || {}).forEach((fieldKey) => {
        config[fieldKey] = null
      })
    } else {
      config[key] = cloneDeep(typedProperties.default ?? null)
    }
  })

  return config
}

export const shouldIntegrationFetchTableNames = (integration: Integration): boolean => {
  return integration.features?.[DatasourceFeature.FETCH_TABLE_NAMES] ?? false
}
