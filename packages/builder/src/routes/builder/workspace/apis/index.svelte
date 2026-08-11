<script lang="ts">
import { goto } from "@roxi/routify"
import { onMount } from "svelte"
import { datasources } from "@/stores/builder"
import { helpers } from "@supertoolmake/shared-core"

$goto

onMount(() => {
  const nonSqlDatasources = ($datasources.list || []).filter(
    (datasource) => !helpers.isSQL(datasource)
  )

  if (nonSqlDatasources.length) {
    $goto(`../datasource/[datasourceId]`, {
      datasourceId: nonSqlDatasources[0]._id ?? "",
    })
  } else {
    $goto("../new")
  }
})
</script>
