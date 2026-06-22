<script lang="ts">
import { Pagination, ProgressCircle } from "@supertoolmake/bbui"
import { fetchData, QueryUtils } from "@supertoolmake/frontend-core"
import type {
  DataFetchDatasource,
  DataFetchOptions,
  SearchFilters,
  SortOrder,
  TableSchema,
  UISearchFilter,
  UserDatasource,
} from "@supertoolmake/types"
import { EmptyFilterOption, LogicalOperator } from "@supertoolmake/types"
import { get } from "svelte/store"
import { getContext, onDestroy } from "svelte"
import { createAutoRefresh } from "@/utils/autoRefresh"

type ProviderDatasource = Exclude<DataFetchDatasource, UserDatasource>

export let dataSource: ProviderDatasource
export let filter: UISearchFilter
export let sortColumn: string
export let sortOrder: SortOrder
export let limit: number
export let paginate: boolean
export let autoRefresh: number
export let scrollPages: boolean = false
export let maxItems: number = 1000

const { styleable, Provider, ActionTypes, API, builderStore } = getContext("sdk")
const component = getContext("component")

const autoRefreshActions = createAutoRefresh()
let queryExtensions: Record<string, any> = {}
let containerEl: HTMLDivElement
let scrollObserver: IntersectionObserver | null = null
let loadingNext = false

const createFetch = (datasource: ProviderDatasource) => {
  return fetchData({
    API,
    datasource,
    options: {
      query,
      sortColumn,
      sortOrder,
      limit,
      paginate,
      scrollPages,
      maxItems,
    },
  })
}

const sanitizeSchema = (schema: TableSchema | null) => {
  if (!schema) {
    return schema
  }
  let cloned = { ...schema }
  Object.entries(cloned).forEach(([field, fieldSchema]) => {
    if (fieldSchema.visible === false) {
      delete cloned[field]
    }
  })
  return cloned
}

const addQueryExtension = (key: string, extension: any) => {
  if (!(key && extension)) {
    return
  }
  queryExtensions = { ...queryExtensions, [key]: extension }
}

const removeQueryExtension = (key: string) => {
  if (!key) {
    return
  }
  const newQueryExtensions = { ...queryExtensions }
  delete newQueryExtensions[key]
  queryExtensions = newQueryExtensions
}

const extendQuery = (
  defaultQuery: SearchFilters,
  extensions: Record<string, any>
): SearchFilters => {
  if (!Object.keys(extensions).length) {
    return defaultQuery
  }
  const extended: SearchFilters = {
    [LogicalOperator.AND]: {
      conditions: [...(defaultQuery ? [defaultQuery] : []), ...Object.values(extensions || {})],
    },
    onEmptyFilter: EmptyFilterOption.RETURN_NONE,
  }

  // If there are no conditions applied at all, clear the request.
  return (extended[LogicalOperator.AND]?.conditions?.length ?? 0) > 0 ? extended : {}
}

$: defaultQuery = QueryUtils.buildQuery(filter)

// We need to manage our lucene query manually as we want to allow components
// to extend it
$: query = extendQuery(defaultQuery, queryExtensions)
$: fetch = createFetch(dataSource)
$: fetch.update({
  query,
  sortColumn,
  sortOrder,
  limit,
  paginate,
  scrollPages,
  maxItems,
})
$: schema = sanitizeSchema($fetch.schema)
$: autoRefreshEnabled = !($builderStore.inBuilder && $builderStore.selectedComponentId)
$: autoRefreshActions.setUp(autoRefreshEnabled ? autoRefresh : null, fetch.refresh)
$: actions = [
  {
    type: ActionTypes.RefreshDatasource,
    callback: () => fetch.refresh(),
    metadata: { dataSource },
  },
  {
    type: ActionTypes.AddDataProviderQueryExtension,
    callback: addQueryExtension,
  },
  {
    type: ActionTypes.RemoveDataProviderQueryExtension,
    callback: removeQueryExtension,
  },
  {
    type: ActionTypes.SetDataProviderSorting,
    callback: ({ column, order }: { column: string; order: SortOrder | undefined }) => {
      let newOptions: Partial<DataFetchOptions> = {}
      if (column) {
        newOptions.sortColumn = column
      }
      if (order) {
        newOptions.sortOrder = order
      }
      if (Object.keys(newOptions)?.length) {
        fetch.update(newOptions)
      }
    },
  },
]

$: dataContext = {
  rows: $fetch.rows,
  info: $fetch.info,
  datasource: dataSource || {},
  schema,
  rowsLength: $fetch.rows.length,
  pageNumber: $fetch.pageNumber + 1,
  // Undocumented properties. These aren't supposed to be used in builder
  // bindings, but are used internally by other components
  id: $component?.id,
  state: {
    query: $fetch.query,
  },
  limit,
  primaryDisplay: ($fetch.definition as any)?.primaryDisplay,
  loaded: $fetch.loaded,
}

const disconnectObserver = () => {
  scrollObserver?.disconnect()
  scrollObserver = null
}

const loadMore = async () => {
  if (loadingNext) {
    return
  }
  const state = get(fetch)
  if (state.loading || !state.hasNextPage || state.rows.length >= maxItems) {
    return
  }
  loadingNext = true
  await fetch.nextPage()
  loadingNext = false
}

const setupScrollObserver = (sentinel: HTMLDivElement) => {
  disconnectObserver()
  let sentinelWasVisible = false
  scrollObserver = new IntersectionObserver(
    (entries) => {
      const isVisible = !!entries[0]?.isIntersecting
      if (isVisible && !sentinelWasVisible && !loadingNext) {
        sentinelWasVisible = true
        loadMore()
      } else if (!isVisible) {
        sentinelWasVisible = false
      }
    },
    { rootMargin: "200px" }
  )
  scrollObserver.observe(sentinel)
}

const onSentinel = (node: HTMLDivElement) => {
  setupScrollObserver(node)
  return {
    destroy() {
      disconnectObserver()
    },
  }
}

$: if (!scrollPages) {
  disconnectObserver()
}

onDestroy(() => {
  autoRefreshActions.clear()
  disconnectObserver()
})
</script>

<div
  use:styleable={$component.styles}
  class="container"
  bind:this={containerEl}
>
  <Provider {actions} data={dataContext}>
    {#if !$fetch.loaded}
      <div class="loading">
        <ProgressCircle />
      </div>
    {:else}
      <slot />
      {#if scrollPages}
        <div use:onSentinel class="scroll-sentinel"></div>
        {#if $fetch.loading}
          <div class="loading">
            <ProgressCircle />
          </div>
        {/if}
      {:else if paginate && $fetch.supportsPagination}
        <div class="pagination">
          <Pagination
            page={$fetch.pageNumber + 1}
            hasPrevPage={$fetch.hasPrevPage}
            hasNextPage={$fetch.hasNextPage}
            goToPrevPage={fetch.prevPage}
            goToNextPage={fetch.nextPage}
          />
        </div>
      {/if}
    {/if}
  </Provider>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
  }
  .loading {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    height: 100px;
  }
  .pagination {
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
    margin-top: var(--spacing-xl);
  }
  .scroll-sentinel {
    height: 1px;
    width: 100%;
  }
</style>
