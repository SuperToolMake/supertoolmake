import type { WorkspaceFavourite, WorkspaceFavouriteResponse } from "@supertoolmake/types"
import { derived, type Readable } from "svelte/store"
import { API } from "@/api"
import { BudiStore } from "../BudiStore"

export type WorkspaceFavouriteLookupState = Record<string, WorkspaceFavourite>

export class WorkspaceFavouriteStore extends BudiStore<WorkspaceFavourite[]> {
  lookup: Readable<WorkspaceFavouriteLookupState>

  constructor() {
    super([])
    this.generateLookup = this.generateLookup.bind(this)

    this.lookup = this.generateLookup()
  }

  generateLookup() {
    return derived([this.store], ([$fav]): WorkspaceFavouriteLookupState => {
      return $fav.reduce((acc: WorkspaceFavouriteLookupState, f: WorkspaceFavourite) => {
        acc[f.resourceId] = f
        return acc
      }, {} as WorkspaceFavouriteLookupState)
    })
  }

  async sync() {
    try {
      const resp: WorkspaceFavouriteResponse = await API.workspace.fetch()
      this.set(resp.favourites)
    } catch {
      console.error("Could not init workspace favourites")
    }
  }
}

export const workspaceFavouriteStore = new WorkspaceFavouriteStore()
