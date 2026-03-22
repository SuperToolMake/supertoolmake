<script>
import { getIntegrationIcon } from "@/helpers/integrationIcons"
export let integrationType
export let schema
export let iconUrl = undefined
export let size = "18"

$: iconInfo = getIntegrationIcon(integrationType, schema, iconUrl)
</script>

{#if iconInfo?.component}
  <svelte:component this={iconInfo.component} width={size} height={size} />
{:else if iconInfo?.icon}
  <i
    class={iconInfo.icon}
    style="font-size: {size}px; display: flex; align-items: center; color: {iconInfo.color ||
      'inherit'};"
  ></i>
{:else if iconInfo?.url}
  <img
    src={iconInfo.url}
    alt=""
    height={size}
    width={size}
    loading="lazy"
    decoding="async"
    draggable="false"
  />
{/if}
