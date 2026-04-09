<script>
import { Select } from "@supertoolmake/bbui"
import { datasources } from "@/stores/builder"

export let value = null

$: dataSources = $datasources.list
  .filter((ds) => ds.source === "MINIO")
  .map((ds) => ({
    label: ds.name,
    value: ds._id,
  }))
</script>

<Select options={dataSources} {value} on:change />
