<script>
  import {
    tables,
    datasources,
    userSelectedResourceMap,
    contextMenuStore,
    appStore,
    dataEnvironmentStore,
  } from "@/stores/builder"
  import IntegrationIcon from "@/components/backend/DatasourceNavigator/IntegrationIcon.svelte"
  import { Icon, AbsTooltip } from "@budibase/bbui"
  import { params, url } from "@roxi/routify"
  import EditTableModal from "@/components/backend/TableNavigator/TableNavItem/EditModal.svelte"
  import DeleteConfirmationModal from "@/components/backend/modals/DeleteDataConfirmationModal.svelte"
  import { UserAvatars } from "@budibase/frontend-core"
  import { DB_TYPE_EXTERNAL } from "@/constants/backend"
  import { TableNames } from "@/constants"
  import { derived } from "svelte/store"
  import { DataEnvironmentMode } from "@budibase/types"

  $params
  $url

  // Editing table
  let editTableModal
  let deleteTableModal

  $: tableId = $params.tableId
  $: isUsersTable = tableId === TableNames.USERS
  $: table = $tables.list.find(table => table._id === tableId)
  $: datasource = $datasources.list.find(ds => ds._id === table?.sourceId)
  $: tableSelectedBy = $userSelectedResourceMap[table?._id]
  $: isDevMode = $dataEnvironmentStore.mode === DataEnvironmentMode.DEVELOPMENT
  $: tableEditable = table?._id !== TableNames.USERS && isDevMode
  $: activeId = decodeURIComponent($params.tableId)
  $: tableName =
    table?._id === TableNames.USERS ? "App users" : table?.name || ""

  const tableUrl = derived(
    url,
    $url => tableId => $url(`../[tableId]`, { tableId })
  )

  const openTableContextMenu = e => {
    if (!tableEditable) {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    contextMenuStore.open(
      table._id,
      [
        {
          icon: "pencil",
          name: "Edit",
          keyBind: null,
          visible: table?.sourceType !== DB_TYPE_EXTERNAL,
          disabled: false,
          callback: editTableModal?.show,
        },
        {
          icon: "trash",
          name: "Delete",
          keyBind: null,
          visible: true,
          disabled: false,
          callback: deleteTableModal?.show,
        },
      ],
      {
        x: e.clientX,
        y: e.clientY,
      }
    )
  }
</script>

<div class="nav">
  {#if !isUsersTable}
    <a
      href={`/builder/workspace/${$appStore.appId}/data/datasource/${datasource?._id}`}
    >
      <IntegrationIcon
        integrationType={datasource?.source}
        schema={datasource?.schema}
        size="24"
      />
    </a>
  {:else}
    <span class="user-icon">
      <Icon name="users-three" />
    </span>
  {/if}
  <a
    href={$tableUrl(tableId)}
    class="nav-item"
    class:active={tableId === activeId}
    on:contextmenu={openTableContextMenu}
  >
    <AbsTooltip text={tableName}>
      <div class="nav-item__title">
        {tableName}
      </div>
    </AbsTooltip>
    {#if tableSelectedBy}
      <UserAvatars size="XS" users={tableSelectedBy} />
    {/if}
    {#if tableEditable}
      <Icon
        on:click={openTableContextMenu}
        hoverable
        size="M"
        weight="bold"
        name="dots-three"
        color="var(--spectrum-global-color-gray-600)"
        hoverColor="var(--spectrum-global-color-gray-900)"
      />
    {/if}
  </a>
</div>

{#if table && tableEditable}
  <EditTableModal {table} bind:this={editTableModal} />
  <DeleteConfirmationModal source={table} bind:this={deleteTableModal} />
{/if}

<style>
  /* Main containers */
  .nav {
    height: 50px;
    border-bottom: var(--border-light);
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    padding: 0 var(--spacing-xl);
    gap: 8px;
    background: var(--background);
  }

  /* Table and view items */
  .nav-item {
    padding: 0 8px;
    height: 32px;
    border-radius: 4px;
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    gap: var(--spacing-m);
    transition:
      background 130ms ease-out,
      color 130ms ease-out;
    color: var(--spectrum-global-color-gray-600);
    font-weight: 500;
    border: 0.5px solid transparent;
    border-radius: 8px;
  }
  .nav-item.active,
  .nav-item:hover {
    background: var(--spectrum-global-color-gray-200);
    cursor: default;
    border: 0.5px solid var(--spectrum-global-color-gray-300);
    border-radius: 8px;
    color: var(--spectrum-global-color-gray-900);
    font-weight: 500;
  }
  .nav-item:not(.active) :global(.icon) {
    display: none;
  }
  .nav-item__title {
    max-width: 150px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }

  .nav .user-icon :global(i) {
    font-size: 24px;
  }
</style>
