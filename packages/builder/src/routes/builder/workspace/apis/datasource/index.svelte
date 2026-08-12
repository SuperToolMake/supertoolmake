<script>
import { goto as gotoStore } from "@roxi/routify"
import { onMount } from "svelte"
import { datasources } from "@/stores/builder"
import { helpers } from "@supertoolmake/shared-core"

$: goto = $gotoStore

onMount(async () => {
  const nonSqlDatasources = ($datasources.list || []).filter(
    (datasource) => !helpers.isSQL(datasource)
  )

  if ($datasources.selected && !helpers.isSQL($datasources.selected)) {
    goto(`../[datasourceId]`, {
      datasourceId: $datasources.selected?._id,
    })
  } else if (nonSqlDatasources.length) {
    goto(`../[datasourceId]`, {
      datasourceId: nonSqlDatasources[0]._id,
    })
  } else {
    goto("../../new")
  }
})
</script>
