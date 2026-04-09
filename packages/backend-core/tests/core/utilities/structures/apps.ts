import type { Workspace } from "@supertoolmake/types"
import { DEFAULT_TENANT_ID, DocumentType } from "../../../../src/constants"
import { generator } from "."

export function app(id: string): Workspace {
  return {
    _id: DocumentType.WORKSPACE_METADATA,
    appId: id,
    type: "",
    version: "0.0.1",
    componentLibraries: [],
    name: generator.name(),
    url: `/custom-url`,
    instance: {
      _id: id,
    },
    tenantId: DEFAULT_TENANT_ID,
    status: "",
    template: undefined,
  }
}
