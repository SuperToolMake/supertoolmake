import { context } from "@supertoolmake/backend-core"
import {
  type BuildSchemaFromSourceRequest,
  type BuildSchemaFromSourceResponse,
  type CreateDatasourceRequest,
  type CreateDatasourceResponse,
  type Datasource,
  type DatasourcePlus,
  type DatasourceRelationshipConfig,
  type DeleteDatasourceResponse,
  type DynamicVariable,
  type FetchDatasourceInfoRequest,
  type FetchDatasourceInfoResponse,
  type FetchDatasourceRelationshipInfoRequest,
  type FetchDatasourceRelationshipInfoResponse,
  type FetchDatasourcesResponse,
  type FetchDatasourceViewInfoRequest,
  type FetchDatasourceViewInfoResponse,
  type FindDatasourcesResponse,
  type RowValue,
  SourceName,
  type UpdateDatasourceRequest,
  type UpdateDatasourceResponse,
  type UserCtx,
  type VerifyDatasourceRequest,
  type VerifyDatasourceResponse,
} from "@supertoolmake/types"
import { isEqual } from "lodash"
import { getQueryParams } from "../../db/utils"
import sdk from "../../sdk"
import { processTable } from "../../sdk/workspace/tables/getters"
import { invalidateCachedVariable } from "../../threads/utils"
import { builderSocket } from "../../websockets"

export async function fetch(ctx: UserCtx<void, FetchDatasourcesResponse>) {
  ctx.body = await sdk.datasources.fetch()
}

export async function verify(ctx: UserCtx<VerifyDatasourceRequest, VerifyDatasourceResponse>) {
  const { datasource } = ctx.request.body
  const enrichedDatasource = await sdk.datasources.getAndMergeDatasource(datasource)
  const connector = await sdk.datasources.getConnector(enrichedDatasource)
  if (!connector.testConnection) {
    ctx.throw(400, "Connection information verification not supported")
  }
  const response = await connector.testConnection()

  ctx.body = {
    connected: response.connected,
    error: response.error,
  }
}

export async function information(
  ctx: UserCtx<FetchDatasourceInfoRequest, FetchDatasourceInfoResponse>
) {
  const { datasource } = ctx.request.body
  const enrichedDatasource = await sdk.datasources.getAndMergeDatasource(datasource)
  const connector = (await sdk.datasources.getConnector(enrichedDatasource)) as DatasourcePlus
  if (!connector.getTableNames) {
    ctx.throw(400, "Table name fetching not supported by datasource")
  }
  const tableNames = await connector.getTableNames()
  ctx.body = {
    tableNames: tableNames.sort(),
  }
}

export async function viewInformation(
  ctx: UserCtx<FetchDatasourceViewInfoRequest, FetchDatasourceViewInfoResponse>
) {
  const { datasource } = ctx.request.body
  let views: string[] = []
  let error: string | undefined

  try {
    const enrichedDatasource = await sdk.datasources.getAndMergeDatasource(datasource)
    const connector = (await sdk.datasources.getConnector(enrichedDatasource)) as DatasourcePlus

    if (connector.getViewNames) {
      views = await connector.getViewNames()
    } else {
      error = "View fetching not supported by datasource"
    }
  } catch (err) {
    error = (err as Error).message || "Unknown error"
  }

  ctx.body = {
    views: views.sort(),
    error,
  }
}

export async function getRelationshipInformation(
  ctx: UserCtx<FetchDatasourceRelationshipInfoRequest, FetchDatasourceRelationshipInfoResponse>
) {
  const { datasource } = ctx.request.body
  let relationships: DatasourceRelationshipConfig[] = []
  let error: string | undefined

  try {
    const enrichedDatasource = await sdk.datasources.getAndMergeDatasource(datasource)
    const connector = (await sdk.datasources.getConnector(enrichedDatasource)) as DatasourcePlus

    if (connector.getRelationships) {
      // Extract imported table names from datasource.entities
      const importedTableNames = Object.keys(datasource.entities || {})
      relationships = await connector.getRelationships(importedTableNames)
    } else {
      error = "Relationship fetching not supported by datasource"
    }
  } catch (err) {
    error = (err as Error).message || "Unknown error"
  }

  ctx.body = {
    relationships: relationships.sort((a, b) => a.label.localeCompare(b.label)),
    error,
  }
}

export async function buildSchemaFromSource(
  ctx: UserCtx<BuildSchemaFromSourceRequest, BuildSchemaFromSourceResponse>
) {
  const datasourceId = ctx.params.datasourceId
  const tablesFilter = ctx.request.body.tablesFilter

  const { datasource, errors } = await sdk.datasources.buildSchemaFromSource(
    datasourceId,
    tablesFilter
  )

  ctx.body = {
    datasource: await sdk.datasources.removeSecretSingle(datasource),
    errors,
  }
}

/**
 * Check for variables that have been updated or removed and invalidate them.
 */
async function invalidateVariables(existingDatasource: Datasource, updatedDatasource: Datasource) {
  const existingVariables: DynamicVariable[] = existingDatasource.config?.dynamicVariables || []
  const updatedVariables: DynamicVariable[] = updatedDatasource.config?.dynamicVariables || []
  const toInvalidate = []

  if (!existingVariables) {
    return
  }

  if (!updatedVariables) {
    // invalidate all
    toInvalidate.push(...existingVariables)
  } else {
    // invaldate changed / removed
    existingVariables.forEach((existing) => {
      const unchanged = updatedVariables.find(
        (updated) =>
          existing.name === updated.name &&
          existing.queryId === updated.queryId &&
          existing.value === updated.value
      )
      if (!unchanged) {
        toInvalidate.push(existing)
      }
    })
  }
  await invalidateCachedVariable(toInvalidate)
}

export async function update(ctx: UserCtx<UpdateDatasourceRequest, UpdateDatasourceResponse>) {
  const db = context.getWorkspaceDB()
  const datasourceId = ctx.params.datasourceId
  const baseDatasource = await sdk.datasources.get(datasourceId)
  await invalidateVariables(baseDatasource, ctx.request.body)

  const dataSourceBody: Datasource = ctx.request.body

  const datasource: Datasource = {
    ...baseDatasource,
    ...sdk.datasources.mergeConfigs(dataSourceBody, baseDatasource),
  }

  // this block is specific to GSheets, if no auth set, set it back
  const auth = baseDatasource.config?.auth
  if (auth) {
    // don't strip auth config from DB
    datasource.config!.auth = auth
  }

  // check all variables are unique
  if (datasource.source === SourceName.REST && !sdk.datasources.areRESTVariablesValid(datasource)) {
    ctx.throw(400, "Duplicate dynamic/static variable names are invalid.")
  }

  const response = await db.put(sdk.tables.populateExternalTableSchemas(datasource))
  datasource._rev = response.rev

  ctx.message = "Datasource saved successfully."
  ctx.body = {
    datasource: await sdk.datasources.removeSecretSingle(
      sdk.datasources.addDatasourceFlags(datasource)
    ),
  }
  builderSocket?.emitDatasourceUpdate(ctx, datasource)
  // send table updates if they have occurred
  if (datasource.entities) {
    for (let table of Object.values(datasource.entities)) {
      const oldTable = baseDatasource.entities?.[table.name]
      if (!(oldTable && isEqual(oldTable, table))) {
        table = await processTable(table)
        builderSocket?.emitTableUpdate(ctx, table, { includeOriginator: true })
      }
    }
  }
}

export async function save(ctx: UserCtx<CreateDatasourceRequest, CreateDatasourceResponse>) {
  const { datasource: datasourceData, fetchSchema, tablesFilter } = ctx.request.body
  const { datasource, errors } = await sdk.datasources.save(datasourceData, {
    fetchSchema,
    tablesFilter,
  })

  ctx.body = {
    datasource: await sdk.datasources.removeSecretSingle(
      sdk.datasources.addDatasourceFlags(datasource)
    ),
    errors,
  }
  builderSocket?.emitDatasourceUpdate(ctx, datasource)
}

export async function destroy(ctx: UserCtx<void, DeleteDatasourceResponse>) {
  const db = context.getWorkspaceDB()
  const datasourceId = ctx.params.datasourceId

  // Delete all queries for the datasource

  const queries = await db.allDocs<RowValue>(getQueryParams(datasourceId))
  await db.bulkDocs(
    queries.rows.map((row) => ({
      _id: row.id,
      _rev: row.value.rev,
      _deleted: true,
    }))
  )

  // delete the datasource
  await db.remove(datasourceId, ctx.params.revId)

  ctx.body = { message: `Datasource deleted.` }
  builderSocket?.emitDatasourceDeletion(ctx, datasourceId)
}

export async function find(ctx: UserCtx<void, FindDatasourcesResponse>) {
  const datasource = await sdk.datasources.get(ctx.params.datasourceId)
  ctx.body = await sdk.datasources.removeSecretSingle(datasource)
}
