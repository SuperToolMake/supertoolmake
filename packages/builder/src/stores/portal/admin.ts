import type { ConfigChecklistResponse, GetEnvironmentResponse } from "@supertoolmake/types"
import { get } from "svelte/store"
import { API } from "@/api"
import { BudiStore } from "../BudiStore"
import { auth } from "./auth"

export interface AdminState extends GetEnvironmentResponse {
  loaded: boolean
  checklist?: ConfigChecklistResponse
}

export class AdminStore extends BudiStore<AdminState> {
  constructor() {
    super({
      loaded: false,
      isDev: false,
      offlineMode: false,
      maintenance: [],
    })
  }

  async init() {
    await this.getChecklist()
    await this.getEnvironment()
    this.update((store) => {
      store.loaded = true
      return store
    })
  }

  async getEnvironment() {
    const environment = await API.getEnvironment()
    this.update((store) => {
      store.isDev = environment.isDev
      store.baseUrl = environment.baseUrl
      store.offlineMode = environment.offlineMode
      store.maintenance = environment.maintenance
      store.passwordMinLength = environment.passwordMinLength

      return store
    })
  }

  async getChecklist() {
    const tenantId = get(auth).tenantId
    const checklist = await API.getChecklist(tenantId)
    this.update((store) => {
      store.checklist = checklist
      return store
    })
  }

  unload() {
    this.update((store) => {
      store.loaded = false
      return store
    })
  }
}

export const admin = new AdminStore()
