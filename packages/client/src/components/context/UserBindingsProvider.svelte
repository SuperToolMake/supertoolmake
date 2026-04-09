<script>
import { Constants } from "@supertoolmake/frontend-core"
import { ActionTypes } from "@/constants"
import { authStore, currentRole } from "@/stores"
import Provider from "./Provider.svelte"

// Register this as a refreshable datasource so that user changes cause
// the user object to be refreshed
$: actions = [
  {
    type: ActionTypes.RefreshDatasource,
    callback: () => authStore.actions.fetchUser(),
    metadata: {
      dataSource: { type: "table", tableId: Constants.TableNames.USERS },
    },
  },
]
</script>

<Provider key="user" data={{ ...$authStore, roleId: $currentRole }} {actions}>
  <slot />
</Provider>
