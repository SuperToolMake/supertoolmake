import type { ComponentType } from "svelte"
import { get } from "svelte/store"
import { integrations } from "@/stores/builder/integrations"
import MinIO from "@/components/backend/DatasourceNavigator/icons/MinIO.svelte"
import MySQL from "@/components/backend/DatasourceNavigator/icons/MySQL.svelte"

export type IconInfo =
  | { icon: string; color?: string; component?: never; url?: never }
  | { component: ComponentType; color?: string; icon?: never; url?: never }
  | { url: string; icon?: never; component?: never; color?: never }

export const PHOSPHOR_ICONS: Record<string, { name: string; weight?: string; color?: string }> = {
  POSTGRES: { name: "lightning", weight: "duotone", color: "#3DD08E" },
  MONGODB: { name: "leaf", weight: "duotone", color: "#4B9E46" },
  SQL_SERVER: { name: "database", weight: "duotone", color: "#0072C6" },
  REST: { name: "globe-simple", weight: "duotone" },
  FIRESTORE: { name: "flame", weight: "duotone", color: "#FFA000" },
  REDIS: { name: "shapes", weight: "duotone", color: "#DC382D" },
  CUSTOM: { name: "plugs-connected", weight: "duotone", color: "#6B6B6B" },
}

export const SVELTE_COMPONENT_ICONS: Record<string, { component: ComponentType; color: string }> = {
  MINIO: {
    component: MinIO,
    color: "#C72E49",
  },
  MYSQL: {
    component: MySQL,
    color: "#00758F",
  },
}

export const getIntegrationIcon = (
  integrationType: string,
  schema?: unknown,
  iconUrl?: string
): IconInfo | undefined => {
  const integrationList = get(integrations)
  if (!integrationList) {
    return
  }
  if (iconUrl) {
    return { url: iconUrl }
  }
  const integration = integrationList[integrationType as keyof typeof integrationList]
  if (integration?.iconUrl) {
    return { url: integration.iconUrl }
  }

  if (SVELTE_COMPONENT_ICONS[integrationType]) {
    const { component, color } = SVELTE_COMPONENT_ICONS[integrationType]
    return { component, color }
  }

  const isCustom =
    typeof schema === "object" && schema !== null && "custom" in schema && schema.custom
  const iconData = PHOSPHOR_ICONS[integrationType] || (isCustom ? PHOSPHOR_ICONS.CUSTOM : undefined)
  if (!iconData) {
    return
  }
  const weightClass = iconData.weight ? ` ph-${iconData.weight}` : ""
  return { icon: `ph-${iconData.name}${weightClass}`, color: iconData.color }
}
