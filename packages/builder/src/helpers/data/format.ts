import { Datasource, Table, UITableResource } from "@budibase/types"

export const datasourceSelect = {
  table: (table: Table, datasources: Omit<Datasource, "entities">[]) => {
    const sourceId = table.sourceId || (table as any).datasourceId
    const datasource = datasources.find(ds => ds._id === sourceId)
    return {
      label: table.name,
      tableId: table._id,
      type: "table",
      datasourceName: datasource?.name,
    }
  },
}

export const tableSelect = {
  table: (table: Table): UITableResource => ({
    type: "table",
    label: table.name,
    tableId: table._id!,
    resourceId: table._id!,
  }),
}

export const sortAndFormat = {
  tables: (tables: Table[], datasources: Omit<Datasource, "entities">[]) => {
    return tables
      .map(table => {
        const formatted = datasourceSelect.table(table, datasources)
        return {
          ...formatted,
          resourceId: table._id,
        }
      })
      .sort((a, b) => {
        // sort tables alphabetically, grouped by datasource
        const dsA = a.datasourceName ?? ""
        const dsB = b.datasourceName ?? ""

        const dsComparison = dsA.localeCompare(dsB)
        if (dsComparison !== 0) {
          return dsComparison
        }
        return a.label.localeCompare(b.label)
      })
  },
}
