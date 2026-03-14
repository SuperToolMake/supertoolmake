<script lang="ts">
import { params } from "@roxi/routify"
import { builderStore, queries } from "@/stores/builder"

$: setQueryId($params.queryId)
$: queryId = $queries.selectedQueryId
$: builderStore.selectResource(queryId!)

const validate = (id: string) => id === "new" || $queries.list?.some((q) => q._id === id)

const setQueryId = (queryId: string) => {
  if (validate(queryId)) {
    queries.select(queryId)
  }
}
</script>

{#key $queries.selectedQueryId}
  <slot />
{/key}
