import type { Datasource, RestConfig } from "@supertoolmake/types"
import { SourceName, WORKSPACE_API_CONFIG_ID } from "@supertoolmake/types"
import { writable } from "svelte/store"
import { API } from "@/api"

interface WorkspaceAPIState {
  datasource: Datasource
  loading: boolean
}

const emptyDatasource = (): Datasource => ({
  _id: WORKSPACE_API_CONFIG_ID,
  type: "datasource",
  source: SourceName.REST,
  name: "APIs",
  config: {},
})

const store = writable<WorkspaceAPIState>({
  datasource: emptyDatasource(),
  loading: false,
})

export const workspaceApis = {
  subscribe: store.subscribe,
  async fetch() {
    store.update((state) => ({ ...state, loading: true }))
    try {
      const response = await API.getWorkspaceAPI()
      store.update((state) => ({
        ...state,
        datasource: {
          ...state.datasource,
          config: response.config || {},
        },
        loading: false,
      }))
    } catch (error) {
      store.update((state) => ({ ...state, loading: false }))
      throw error
    }
  },
  async save(config: RestConfig) {
    const response = await API.saveWorkspaceAPI({ config })
    store.update((state) => ({
      ...state,
      datasource: { ...state.datasource, config: response.config || {} },
    }))
    return response
  },
}
