<script lang="ts">
  import { queries, builderStore } from "@/stores/builder"
  import { params } from "@roxi/routify"

  $: setQueryId($params.queryId)
  $: queryId = $queries.selectedQueryId
  $: builderStore.selectResource(queryId!)

  const validate = (id: string) =>
    id === "new" || $queries.list?.some(q => q._id === id)

  const setQueryId = (queryId: string) => {
    if (validate(queryId)) {
      queries.select(queryId)
    }
  }
</script>

{#key $queries.selectedQueryId}
  <slot />
{/key}
