<script lang="ts">
import { DNDPlaceholderID } from "@/constants"
import { dndIsDragging, dndParent, dndSource, dndStore, isGridScreen } from "@/stores"
import IndicatorSet from "./IndicatorSet.svelte"

// On grid screens, don't draw the indicator until we've dragged over the
// screen. When this happens, the dndSource props will be set as we will have
// attached grid metadata styles.
$: waitingForGrid = $isGridScreen && !$dndStore.meta?.props
</script>

{#if $dndIsDragging}
  {#if !$isGridScreen && $dndParent}
    <IndicatorSet
      componentId={$dndParent}
      color="var(--spectrum-global-color-static-green-400)"
      zIndex={920}
      prefix="Inside"
    />
  {/if}

  {#if !waitingForGrid}
    <IndicatorSet
      componentId={DNDPlaceholderID}
      color="var(--spectrum-global-color-static-green-500)"
      zIndex={930}
      allowResizeAnchors={false}
      background="hsl(160, 64%, 90%)"
      animate={!$isGridScreen}
      text={$dndSource?.name}
      icon={$dndSource?.icon}
    />
  {/if}
{/if}
