<script>
import { Icon, notifications } from "@supertoolmake/bbui"
import { WorkspaceResource } from "@supertoolmake/types"
import { goto as gotoStore, isActive } from "@roxi/routify"
import DeleteDataConfirmModal from "@/components/backend/modals/DeleteDataConfirmationModal.svelte"
import NavItem from "@/components/common/NavItem.svelte"
import { IntegrationTypes } from "@/constants/backend"
import { customQueryIconColor, customQueryIconText, customQueryText } from "@/helpers/data/utils"
import FavouriteResourceButton from "@/routes/builder/_components/FavouriteResourceButton.svelte"
import {
  contextMenuStore,
  queries,
  userSelectedResourceMap,
  workspaceFavouriteStore,
} from "@/stores/builder"
import EditQueryModal from "./EditQueryModal.svelte"

$gotoStore
$isActive

export let datasource
export let query

const favourites = workspaceFavouriteStore.lookup

let confirmDeleteModal
let editQueryModal
let icon

const getContextMenuItems = () => {
  return [
    {
      icon: "pencil",
      name: "Edit",
      keyBind: null,
      visible: isRestDatasource,
      disabled: false,
      callback: editQueryModal.show,
    },
    {
      icon: "trash",
      name: "Delete",
      keyBind: null,
      visible: true,
      disabled: false,
      callback: confirmDeleteModal.show,
    },
    {
      icon: "copy",
      name: "Duplicate",
      keyBind: null,
      visible: true,
      disabled: false,
      callback: async () => {
        try {
          const newQuery = await queries.duplicate(query)
          goto("./query/[queryId]", { queryId: newQuery._id })
        } catch {
          notifications.error("Error duplicating query")
        }
      },
    },
  ]
}

const openContextMenu = (e) => {
  e.preventDefault()
  e.stopPropagation()

  const items = getContextMenuItems()
  contextMenuStore.open(query._id, items, { x: e.clientX, y: e.clientY })
}

$: favourite = query?._id ? $favourites[query?._id] : undefined
$: isRestDatasource = datasource?.source === IntegrationTypes.REST
$: isSqlDatasource = [
  IntegrationTypes.POSTGRES,
  IntegrationTypes.MYSQL,
  IntegrationTypes.SQL_SERVER,
].includes(datasource?.source)
$: if (isSqlDatasource) {
  icon = "file-sql"
} else if (isRestDatasource) {
  icon = "globe-simple"
} else {
  icon = "file-magnifying-glass"
}
$: iconVerb = isRestDatasource ? customQueryIconText(query) : ""
$: iconColor = isRestDatasource ? customQueryIconColor(query) : undefined

// goto won't work in the context menu callback if the store is called directly
$: goto = $gotoStore
</script>

<NavItem
  on:contextmenu={openContextMenu}
  indentLevel={1}
  {icon}
  iconText={iconVerb}
  {iconColor}
  text={customQueryText(datasource, query)}
  selected={$isActive("./query/[queryId]", { queryId: query._id }) &&
    $queries.selectedQueryId === query._id}
  hovering={query._id === $contextMenuStore.id}
  on:click={() => goto("./query/[queryId]", { queryId: query._id })}
  selectedBy={$userSelectedResourceMap[query._id]}
>
  <div class="buttons">
    <FavouriteResourceButton
      favourite={favourite || {
        resourceType: WorkspaceResource.QUERY,
        resourceId: query._id,
      }}
    />
    <Icon size="M" hoverable name="dots-three" on:click={openContextMenu} />
  </div>
</NavItem>

<DeleteDataConfirmModal source={query} bind:this={confirmDeleteModal} />
<EditQueryModal {query} bind:this={editQueryModal} />

<style>
  .buttons {
    display: flex;
    gap: var(--spacing-xs);
  }
</style>
