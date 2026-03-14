<script lang="ts">
import QueryVerbBadge from "@/components/common/QueryVerbBadge.svelte"
import { customQueryIconColor, customQueryIconText } from "@/helpers/data/utils"

export let value: string | undefined

$: verb = customQueryIconText(value)
$: color = customQueryIconColor(value)
</script>

<QueryVerbBadge {verb} {color} />
