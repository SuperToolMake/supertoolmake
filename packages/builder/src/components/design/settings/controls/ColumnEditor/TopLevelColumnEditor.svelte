<script lang="ts">
import type { TableSchema } from "@budibase/types"
import ColumnEditor from "./ColumnEditor.svelte"

const getTopLevelSchemaFields = (schema: TableSchema) => {
  return Object.values(schema).filter((fieldSchema) => !fieldSchema.nestedJSON)
}
</script>

<ColumnEditor
  {...$$props}
  on:change
  allowCellEditing={false}
  getSchemaFields={getTopLevelSchemaFields}
/>
