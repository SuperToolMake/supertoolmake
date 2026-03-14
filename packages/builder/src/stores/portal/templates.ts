import type { TemplateMetadata } from "@budibase/types"
import { API } from "@/api"
import { BudiStore } from "../BudiStore"

class TemplateStore extends BudiStore<TemplateMetadata[]> {
  constructor() {
    super([])
  }

  async load() {
    const templates = await API.getAppTemplates()
    this.set(templates)
  }
}

export const templates = new TemplateStore()
