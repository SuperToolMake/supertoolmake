<script>
import { notifications } from "@budibase/bbui"
import { cloneDeep } from "lodash/fp"
import { integrations } from "@/stores/builder"
import Panel from "../Panel.svelte"
import RestAuthenticationBuilder from "./RestAuthenticationBuilder.svelte"

export let datasource
export let updatedDatasource
const updateAuthConfigs = async (newAuthConfigs) => {
  localUpdatedDatasource.config.authConfigs = newAuthConfigs

  // Auto-save authentication changes
  try {
    await integrations.saveDatasource(localUpdatedDatasource)
    notifications.success(`Datasource ${localUpdatedDatasource.name} updated successfully`)
  } catch (error) {
    notifications.error(`Error saving datasource: ${error.message}`)
  }
}

$: localUpdatedDatasource = cloneDeep(datasource ?? updatedDatasource)
</script>

<Panel>
  <RestAuthenticationBuilder
    on:change={({ detail }) => updateAuthConfigs(detail)}
    authConfigs={localUpdatedDatasource.config.authConfigs}
  />
</Panel>
