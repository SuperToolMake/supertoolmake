import type { Datasource, Integration, SourceName } from "@budibase/types"
import { get, type Writable, writable } from "svelte/store"
import { API } from "@/api"
import { integrationForDatasource } from "@/stores/selectors"
import { datasources } from "./datasources"

type IntegrationsState = Partial<Record<SourceName, Integration>>

const INITIAL_STATE: IntegrationsState = {}

const createIntegrationsStore = () => {
  const store: Writable<IntegrationsState> = writable(INITIAL_STATE)

  const init = async () => {
    const response = await API.getIntegrations()

    // Filter out undefineds
    const integrations = Object.entries(response).reduce((acc, [key, value]) => {
      if (value) {
        acc[key as SourceName] = value
      }
      return acc
    }, {} as IntegrationsState)
    store.set(integrations)
  }

  const saveDatasource = async (datasource: Datasource) => {
    const integration = integrationForDatasource(get(store), datasource)
    if (!integration) {
      throw new Error("Unable to find integration for datasource")
    }
    await datasources.save({
      datasource,
      integration,
    })
  }

  return {
    ...store,
    init,
    saveDatasource,
  }
}

export const integrations = createIntegrationsStore()
