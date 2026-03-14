<script>
import { getContext } from "svelte"
import ManageAccessButton from "../ManageAccessButton.svelte"

const { datasource } = getContext("grid")

$: ds = $datasource
$: resourceId = ds?.type === "table" ? ds.tableId : ds?.id
</script>

<ManageAccessButton {resourceId} />
