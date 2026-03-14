<script>
import { SchemaTypeOptionsExpanded } from "@/constants/backend"
import KeyValueBuilder from "../KeyValueBuilder.svelte"
import { keyValueArrayToRecord } from "../query"

export let schema
export let onSchemaChange = () => {}

const handleChange = (e) => {
  onSchemaChange(keyValueArrayToRecord(e.detail))
}
</script>

{#key schema}
  <KeyValueBuilder
    on:change={handleChange}
    object={schema}
    name="field"
    headings
    options={SchemaTypeOptionsExpanded}
    compare={(option, value) => option.type === value?.type}
  />
{/key}
