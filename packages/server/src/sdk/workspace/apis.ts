import { context, HTTPError } from "@supertoolmake/backend-core"
import { processObjectSync } from "@supertoolmake/string-templates"
import {
  type Datasource,
  type RestConfig,
  SourceName,
  WORKSPACE_API_CONFIG_ID,
  type WorkspaceAPI,
} from "@supertoolmake/types"
import { cloneDeep } from "lodash/fp"
import { getEnvironmentVariables } from "../utils"
import datasources from "./datasources"

const workspaceAPI: Datasource = {
  _id: WORKSPACE_API_CONFIG_ID,
  type: "datasource",
  source: SourceName.REST,
  name: "APIs",
  config: {},
}

const asDatasource = (config: RestConfig): Datasource => ({
  ...workspaceAPI,
  source: "REST" as Datasource["source"],
  config,
})

const getRaw = async () => {
  const db = context.getWorkspaceDB()
  return await db.tryGet<WorkspaceAPI>(WORKSPACE_API_CONFIG_ID)
}

export async function getWithEnvVars() {
  const existing = await getRaw()
  const config = cloneDeep(existing?.config || {})
  const env = await getEnvironmentVariables()
  const processed = processObjectSync(config, { env }, { onlyFound: true }) as RestConfig
  return {
    datasource: asDatasource(processed),
    envVars: env as Record<string, string>,
  }
}

export async function getResponse() {
  const { datasource } = await getWithEnvVars()
  return await datasources.removeSecretSingle(datasource)
}

export async function save(config: RestConfig) {
  const db = context.getWorkspaceDB()
  const existing = await getRaw()
  const update = asDatasource(config)
  const merged = existing ? datasources.mergeConfigs(update, asDatasource(existing.config)) : update
  const document: WorkspaceAPI = {
    _id: WORKSPACE_API_CONFIG_ID,
    _rev: existing?._rev,
    type: "workspace_api",
    config: merged.config as RestConfig,
  }
  try {
    const response = await db.put(document)
    return { ...document, _rev: response.rev }
  } catch (error: any) {
    if (error?.status === 409) {
      throw new HTTPError("The workspace API settings changed. Please retry.", 409)
    }
    throw error
  }
}

export default {
  getWithEnvVars,
  getResponse,
  save,
}
