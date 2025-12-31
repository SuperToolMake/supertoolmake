import { TableNames } from "@/constants"
import { INTERNAL_TABLE_SOURCE_ID } from "@budibase/types"

const showDatasourceOpen = ({
  selected,
  containsSelected,
  dsToggledStatus,
  searchTerm,
  onlyOneSource,
}) => {
  // We want to display all the ds expanded while filtering ds
  if (searchTerm) {
    return true
  }

  // If the toggle status has been a value
  if (dsToggledStatus !== undefined) {
    return dsToggledStatus
  }

  if (onlyOneSource) {
    return true
  }

  return selected || containsSelected
}

const containsActiveEntity = (
  datasource,
  params,
  isActive,
  tables,
  queries
) => {
  // Check for being on a datasource page
  if (params.datasourceId === datasource._id) {
    return true
  }

  // Check for hardcoded datasource edge cases
  if (
    isActive("./datasource/[datasourceId]", { datasourceId: "bb_internal" }) &&
    datasource._id === INTERNAL_TABLE_SOURCE_ID
  ) {
    return true
  }

  // Check for a matching query
  if (params.queryId) {
    const query = queries.list?.find(q => q._id === params.queryId)
    return datasource._id === query?.datasourceId
  }

  // If there are no entities it can't contain anything
  if (!datasource.entities) {
    return false
  }

  // Get a list of table options
  let options = datasource.entities
  if (!Array.isArray(options)) {
    options = Object.values(options)
  }

  // Check for a matching table
  if (params.tableId) {
    const selectedTable = tables.selected?._id
    return options.find(x => x._id === selectedTable) != null
  }
}

export const enrichDatasources = (
  datasources,
  params,
  isActive,
  tables,
  queries,
  toggledDatasources,
  searchTerm,
  datasourceFilter = _ => true
) => {
  if (!datasources?.list?.length) {
    return []
  }

  const datasourceList = datasources.list.filter(datasourceFilter)
  if (!datasourceList.length) {
    return []
  }

  const onlySource = datasourceList.length === 1
  return datasourceList.map(datasource => {
    const selected =
      isActive("./datasource") &&
      datasources.selectedDatasourceId === datasource._id
    const containsSelected = containsActiveEntity(
      datasource,
      params,
      isActive,
      tables,
      queries
    )

    const dsTables = tables.list.filter(
      table =>
        table.sourceId === datasource._id && table._id !== TableNames.USERS
    )
    const dsQueries = queries.list.filter(
      query => query.datasourceId === datasource._id
    )

    const open = showDatasourceOpen({
      selected,
      containsSelected,
      dsToggledStatus: toggledDatasources[datasource._id],
      searchTerm,
      onlyOneSource: onlySource,
    })

    const visibleDsQueries = dsQueries.filter(
      q =>
        !searchTerm ||
        q.name?.toLowerCase()?.indexOf(searchTerm.toLowerCase()) > -1
    )

    const visibleDsTables = dsTables
      .map(t => ({
        ...t,
      }))
      .filter(
        table =>
          !searchTerm ||
          table.name?.toLowerCase()?.indexOf(searchTerm.toLowerCase()) > -1
      )

    const show = !!(
      !searchTerm ||
      visibleDsQueries.length ||
      visibleDsTables.length
    )
    return {
      ...datasource,
      selected,
      containsSelected,
      open,
      queries: visibleDsQueries,
      tables: visibleDsTables,
      show,
    }
  })
}
