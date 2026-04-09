import type { PublishStatusResponse } from "@supertoolmake/types"
import { API } from "@/api"
import { BudiStore } from "@/stores/BudiStore"

interface WorkspaceDeploymentStoreState extends PublishStatusResponse {}

export class WorkspaceDeploymentStore extends BudiStore<WorkspaceDeploymentStoreState> {
  constructor() {
    super({ workspaceApps: {}, tables: {} })

    this.fetch = this.fetch.bind(this)
    this.reset = this.reset.bind(this)
  }

  async fetch() {
    const { workspaceApps, tables } = await API.deployment.getPublishStatus()
    this.store.update((state) => {
      state.workspaceApps = workspaceApps
      state.tables = tables
      return state
    })
  }

  reset() {
    this.store.set({ workspaceApps: {}, tables: {} })
  }
}

export const workspaceDeploymentStore = new WorkspaceDeploymentStore()
