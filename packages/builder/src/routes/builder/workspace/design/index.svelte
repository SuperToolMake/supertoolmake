<script lang="ts">
import { tick } from "svelte"
import {
  AbsTooltip,
  Body,
  Button,
  Helpers,
  Heading,
  Icon,
  notifications,
  Toggle,
  TooltipPosition,
  TooltipType,
} from "@supertoolmake/bbui"
import { helpers } from "@supertoolmake/shared-core"
import { PublishResourceState, type UIWorkspaceApp, WorkspaceResource } from "@supertoolmake/types"
import { url } from "@roxi/routify"
import ConfirmDialog from "@/components/common/ConfirmDialog.svelte"
import PublishStatusBadge from "@/components/common/PublishStatusBadge.svelte"
import TopBar from "@/components/common/TopBar.svelte"
import { durationFromNow } from "@/helpers"
import { buildLiveUrl } from "@/helpers/urls"
import FavouriteResourceButton from "@/routes/builder/_components/FavouriteResourceButton.svelte"
import WorkspaceAppModal from "@/routes/builder/workspace/design/[workspaceAppId]/[screenId]/_components/WorkspaceApp/WorkspaceAppModal.svelte"
import { contextMenuStore, workspaceAppStore, workspaceFavouriteStore } from "@/stores/builder"
import { auth } from "@/stores/portal"
import NoResults from "../_components/NoResults.svelte"

let showHighlight = false
let selectedWorkspaceApp: UIWorkspaceApp | undefined
let workspaceAppModal: WorkspaceAppModal
let confirmDeleteDialog: ConfirmDialog
let appChangingStatus: string | undefined

const toggleApp = async (workspaceApp: UIWorkspaceApp, enabled: boolean) => {
  try {
    appChangingStatus = workspaceApp._id
    await workspaceAppStore.toggleDisabled(workspaceApp._id!, !enabled)
  } finally {
    appChangingStatus = undefined
  }
}

const deleteWorkspaceApp = async () => {
  if (!selectedWorkspaceApp) {
    return
  }

  try {
    await workspaceAppStore.delete(selectedWorkspaceApp._id!, selectedWorkspaceApp._rev!)

    notifications.success(`App '${selectedWorkspaceApp.name}' deleted successfully`)
  } catch (e: any) {
    let message = "Error deleting app"
    if (e.message) {
      message += ` - ${e.message}`
    }
    notifications.error(message)
  }
}

const buildLiveWorkspaceAppUrl = (workspaceApp?: UIWorkspaceApp | null) => {
  if (
    !workspaceApp ||
    workspaceApp.publishStatus?.state !== PublishResourceState.PUBLISHED ||
    workspaceApp.disabled
  ) {
    return null
  }

  const liveUrl = buildLiveUrl(workspaceApp.url ?? "", true)

  return liveUrl || null
}

const openLiveWorkspaceApp = (liveUrl: string | null) => {
  if (!liveUrl || typeof window === "undefined") {
    return
  }
  window.open(liveUrl, "_blank")
}

const getStatusTimestamp = (workspaceApp: UIWorkspaceApp) => {
  if (workspaceApp.publishStatus.state === PublishResourceState.PUBLISHED) {
    return workspaceApp.publishStatus.publishedAt ?? workspaceApp.updatedAt
  }

  return workspaceApp.updatedAt
}

const getStatusDurationLabel = (workspaceApp: UIWorkspaceApp) => {
  const isLive = workspaceApp.publishStatus.state === PublishResourceState.PUBLISHED
  const duration = durationFromNow(getStatusTimestamp(workspaceApp) || "")

  return isLive ? `Last published ${duration} ago` : `Offline for ${duration}`
}

const getContextMenuOptions = (workspaceApp: UIWorkspaceApp) => {
  const liveUrl = buildLiveWorkspaceAppUrl(workspaceApp)

  const commands: {
    icon: string
    name: string
    visible: boolean
    callback: () => void
    disabled?: boolean
  }[] = [
    {
      icon: "pencil",
      name: "Edit",
      visible: true,
      callback: () => workspaceAppModal.show(),
    },
    {
      icon: "globe-simple",
      name: "View live app",
      visible: Boolean(liveUrl),
      callback: () => openLiveWorkspaceApp(liveUrl),
    },

    {
      icon: "trash",
      name: "Delete",
      visible: true,
      disabled: workspaceApp.publishStatus.state === PublishResourceState.PUBLISHED,
      callback: () => showDeleteDialog(workspaceApp),
    },
  ]

  return commands
}

const showDeleteDialog = async (workspaceApp: UIWorkspaceApp) => {
  selectedWorkspaceApp = workspaceApp
  await tick()
  confirmDeleteDialog.show()
}

const handleToggleChange = async (
  e: CustomEvent<boolean>,
  workspaceApp: UIWorkspaceApp
) => {
  await toggleApp(workspaceApp, e.detail)
}

const openContextMenu = (e: MouseEvent, workspaceApp: UIWorkspaceApp) => {
  e.preventDefault()
  e.stopPropagation()
  selectedWorkspaceApp = workspaceApp
  showHighlight = true
  contextMenuStore.open(
    "workspace-app",
    getContextMenuOptions(workspaceApp),
    {
      x: e.clientX,
      y: e.clientY,
    },
    () => {
      showHighlight = false
    }
  )
}

const runTileAction = (
  e: MouseEvent,
  workspaceApp: UIWorkspaceApp,
  callback: () => void
) => {
  e.preventDefault()
  e.stopPropagation()
  selectedWorkspaceApp = workspaceApp
  callback()
}

const createApp = () => {
  selectedWorkspaceApp = undefined
  workspaceAppModal.show()
}

$: favourites = workspaceFavouriteStore.lookup
$: userName =
  $auth.user?.firstName || $auth.user?.lastName
    ? helpers.getUserLabel($auth.user)
    : ""

$: workspaceApps = $workspaceAppStore.workspaceApps
$: displayedWorkspaceApps = workspaceApps
  .map((app) => {
    return {
      ...app,
      favourite: $favourites?.[app._id!] ?? {
        resourceType: WorkspaceResource.WORKSPACE_APP,
        resourceId: app._id!,
      },
    }
  })
  .sort((a, b) => {
    const aIsFavourite = Boolean(a.favourite._id)
    const bIsFavourite = Boolean(b.favourite._id)

    if (aIsFavourite !== bIsFavourite) {
      return bIsFavourite ? 1 : -1
    }

    const aIsLive = a.publishStatus.state === PublishResourceState.PUBLISHED
    const bIsLive = b.publishStatus.state === PublishResourceState.PUBLISHED

    if (aIsLive !== bIsLive) {
      return bIsLive ? 1 : -1
    }

    return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  })
</script>

<div class="apps-index">
  <TopBar icon="browser" breadcrumbs={[{ text: "Apps" }]} showPublish={false}>
  </TopBar>
  <div class="welcome-section">
    <div class="action-buttons">
      <Button
        icon="lightbulb"
        secondary
        on:click={() => {
          window.open(
            "https://supertoolmake.com/docs/apps/overview/",
            "_blank"
          )
        }}
      >
        Learn
      </Button>
      <Button cta icon="plus" on:click={createApp}>Create new app</Button>
    </div>
  </div>

  <div class="table-wrapper">
    <div class="apps">
      {#each displayedWorkspaceApps as app (app._id)}
        <a
          class="app"
          class:favourite={app.favourite?._id}
          href={$url(`../[workspaceAppId]`, {
            workspaceAppId: app._id ?? "",
          })}
          on:contextmenu={e => openContextMenu(e, app)}
          class:active={showHighlight && selectedWorkspaceApp === app}
        >
          <div class="app-name">
            <span class="favourite-btn">
              <FavouriteResourceButton
                favourite={app.favourite}
                size="L"
                position={TooltipPosition.Top}
                tooltipType={TooltipType.Default}
                noWrap
              />
            </span>
            <Icon name="browser" size="L" color="var(--spectrum-global-color-gray-700)" />
            <Body size="L" color="var(--spectrum-global-color-gray-900)">{app.name}</Body>
          </div>
          <div class="status-info">
            <div class="status-duration">
              <AbsTooltip
                position={TooltipPosition.Top}
                text={Helpers.getDateDisplayValue(getStatusTimestamp(app))}
              >
                <span>{getStatusDurationLabel(app)}</span>
              </AbsTooltip>
            </div>
            <div class="status-control">
              <PublishStatusBadge
                status={app.publishStatus.state}
                loading={appChangingStatus === app._id}
              />
              <AbsTooltip
                position={TooltipPosition.Top}
                text={app.publishStatus.state === PublishResourceState.PUBLISHED
                  ? "Switch off"
                  : "Switch on"}
                noWrap
              >
                <span class="status-toggle">
                  <Toggle
                    noPadding
                    value={app.publishStatus.state === PublishResourceState.PUBLISHED}
                    disabled={appChangingStatus === app._id}
                    on:change={e => handleToggleChange(e, app)}
                  />
                </span>
              </AbsTooltip>
            </div>
          </div>
          <div class="actions">
            {#each getContextMenuOptions(app).filter(command => command.visible) as command}
              <AbsTooltip
                position={TooltipPosition.Top}
                text={command.disabled ? "Cannot delete live app" : command.name}
                noWrap
              >
                <button
                  class="tile-action"
                  type="button"
                  aria-label={command.name}
                  disabled={command.disabled}
                  on:click={e => runTileAction(e, app, command.callback)}
                >
                  <Icon
                    name={command.icon}
                    size="L"
                    hoverable
                    disabled={command.disabled}
                  />
                </button>
              </AbsTooltip>
            {/each}
          </div>
        </a>
      {/each}
      {#if !workspaceApps.length}
        <NoResults
          ctaText="Create your first app"
          onCtaClick={createApp}
          resourceType="app"
        >
          No apps yet! Build your first app to get started.
        </NoResults>
      {/if}
    </div>
  </div>
</div>

<WorkspaceAppModal
  bind:this={workspaceAppModal}
  workspaceApp={selectedWorkspaceApp}
  on:hide={() => (selectedWorkspaceApp = undefined)}
/>

{#if selectedWorkspaceApp}
  <ConfirmDialog
    bind:this={confirmDeleteDialog}
    okText="Delete App"
    onOk={deleteWorkspaceApp}
    title="Confirm Deletion"
  >
    Deleting <b>{selectedWorkspaceApp.name}</b> cannot be undone. Are you sure?
  </ConfirmDialog>
{/if}

<style>
  .apps-index {
    background: var(--background);
    flex: 1 1 auto;
    --border: 1px solid var(--spectrum-global-color-gray-200);
    display: flex;
    flex-direction: column;
  }
  .welcome-section {
    padding: 28px 0 24px;
    border-bottom: var(--border);
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: var(--spacing-xl);
  }
  .welcome-copy {
    min-width: 0;
  }
  .welcome-copy :global(.spectrum-Heading) {
    margin: 0;
  }
  .welcome-copy :global(.spectrum-Body) {
    margin: var(--spacing-xs) 0 0;
  }
  .action-buttons {
    display: flex;
    gap: 8px;
    width: min(100%, 1200px);
    box-sizing: border-box;
    padding: 0 12px;
    margin: 0 auto;
    justify-content: flex-end;
  }
  .app {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 170px;
    grid-template-rows: auto auto;
    border-bottom: var(--border);
    align-items: center;
    box-sizing: border-box;
  }
  .app {
    min-height: 96px;
    padding: 16px 12px;
    color: var(--text-color);
    transition: background 130ms ease-out;

      &:hover,
      &.active {
        background: var(--spectrum-global-color-gray-200);
      }
  }
  .app-name {
    display: flex;
    align-items: center;
    gap: var(--spacing-l);
    min-width: 0;
    grid-column: 1;
    grid-row: 1;
    padding-right: 180px;
  }
  .app-name :global(.spectrum-Body) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .status-control {
    display: flex;
    align-items: center;
    gap: var(--spacing-s);
    grid-column: 1;
    grid-row: 1 / span 2;
    justify-self: end;
    align-self: center;
  }
  .status-info {
    display: contents;
  }
  .status-duration {
    grid-column: 1;
    grid-row: 2;
    margin-left: 73px;
  }
  .actions {
    justify-content: flex-end;
    display: flex;
    align-items: center;
    pointer-events: none;
    gap: var(--spacing-s);
    grid-column: 2;
    grid-row: 1 / span 2;
  }

  .actions > * {
    opacity: 1;
    pointer-events: all;
    transition: opacity 130ms ease-out;
  }

  .tile-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border: 0;
    border-radius: var(--border-radius-s);
    background: transparent;
    color: var(--spectrum-global-color-gray-700);
    cursor: pointer;
  }

  .tile-action:hover {
    background: var(--spectrum-global-color-gray-200);
    color: var(--spectrum-global-color-gray-900);
  }

  .update-version :global(.spectrum-ActionButton-label) {
    display: flex;
    gap: var(--spacing-s);
  }

  .table-wrapper {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    height: 0;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }

  .apps {
    overflow-y: auto;
    flex: 1 1 auto;
    border-top: var(--border);
  }

  @media (max-width: 700px) {
    .welcome-section {
      padding: 24px 0;
      align-items: flex-start;
      flex-direction: column;
    }
    .action-buttons {
      flex-wrap: wrap;
      width: 100%;
      padding: 0 12px 0 20px;
    }
    .app {
      height: 80px;
      min-height: 0;
      grid-template-columns: minmax(0, 1fr) 80px;
      grid-template-rows: auto;
      row-gap: 0;
      column-gap: 0;
      padding-top: 0;
      padding-bottom: 0;
    }
    .app > :nth-child(2) {
      display: none;
    }
    .app-name {
      grid-column: 1;
      grid-row: 1;
      padding-right: 0;
    }
    .actions {
      grid-column: 2;
      grid-row: 1;
    }
    .tile-action {
      display: none;
    }
  }
</style>
