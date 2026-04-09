<script lang="ts">
import { Icon } from "@supertoolmake/bbui"
import { sdk } from "@supertoolmake/shared-core"
import { appsStore } from "@/stores/portal/apps"
import type { EnrichedUser, ParsedInvite } from "@/types"

export let row: EnrichedUser | ParsedInvite
const getCount = (row: EnrichedUser | ParsedInvite) => {
  const appList = priviliged ? $appsStore.apps : row.apps
  return appList?.length || 0
}

$: priviliged = sdk.users.isAdminOrBuilder(row)
$: count = getCount(row)
</script>

<div class="align">
  <div class="spacing">
    <Icon name="browser" />
  </div>
  {count}
</div>

<style>
  .align {
    display: flex;
    overflow: hidden;
  }
  .spacing {
    margin-right: var(--spacing-m);
  }
</style>
