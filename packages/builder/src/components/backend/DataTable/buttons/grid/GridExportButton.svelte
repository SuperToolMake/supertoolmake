<script>
import { getContext } from "svelte"
import ExportButton from "../ExportButton.svelte"

const { rows, columns, datasource, sort, selectedRows, filter } = getContext("grid")

$: disabled = !$rows.length || !$columns.length
$: selectedRowArray = Object.keys($selectedRows).map((id) => ({ _id: id }))
</script>

<ExportButton
  {disabled}
  view={$datasource.tableId}
  filters={$filter}
  sorting={{
    sortColumn: $sort.column,
    sortOrder: $sort.order,
  }}
  selectedRows={selectedRowArray}
/>
