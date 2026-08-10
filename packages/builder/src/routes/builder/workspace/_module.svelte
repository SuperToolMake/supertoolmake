<script>
import WorkspaceLayout from "./_module.workspace.svelte"
import { appStore } from "@/stores/builder"
import { enrichedApps } from "@/stores/portal"

$: currentAppId =
  $appStore.appId || $enrichedApps.find((app) => app.editable)?.devId || $enrichedApps[0]?.devId
</script>

<!-- Needs to agressively re-render if the appId has changed -->
{#if currentAppId}
  {#key currentAppId}
    <WorkspaceLayout application={currentAppId}>
      <slot />
    </WorkspaceLayout>
  {/key}
{/if}
