import * as format from "@/helpers/data/format"
import { Datasource, Table } from "@budibase/types"

export type SourceOption = TableOption

type TableOption = ReturnType<typeof makeTableOption>

export const makeTableOption = (
  table: Table,
  datasources: Omit<Datasource, "entities">[]
) => ({
  icon: "table",
  name: table.name,
  id: table._id!,
  tableSelectFormat: format.tableSelect.table(table),
  datasourceSelectFormat: format.datasourceSelect.table(table, datasources),
})
