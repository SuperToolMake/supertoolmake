import { cache, context, db as dbCore, errors } from "@budibase/backend-core"
import {
  DeploymentDoc,
  DeploymentProgressResponse,
  DeploymentStatus,
  FetchDeploymentResponse,
  PublishStatusResponse,
  PublishWorkspaceRequest,
  PublishWorkspaceResponse,
  Table,
  UserCtx,
} from "@budibase/types"
import { DocumentType } from "../../../db/utils"
import env from "../../../environment"
import sdk from "../../../sdk"
import { builderSocket } from "../../../websockets"
import Deployment from "./Deployment"

// the max time we can wait for an invalidation to complete before considering it failed
const MAX_PENDING_TIME_MS = 30 * 60000

// checks that deployments are in a good state, any pending will be updated
async function checkAllDeployments(
  deployments: any
): Promise<{ updated: boolean; deployments: DeploymentDoc }> {
  let updated = false
  let deployment: any
  for (deployment of Object.values(deployments.history)) {
    // check that no deployments have crashed etc and are now stuck
    if (
      deployment.status === DeploymentStatus.PENDING &&
      Date.now() - deployment.updatedAt > MAX_PENDING_TIME_MS
    ) {
      deployment.status = DeploymentStatus.FAILURE
      deployment.err = "Timed out"
      updated = true
    }
  }
  return { updated, deployments }
}

async function storeDeploymentHistory(deployment: Deployment) {
  const deploymentJSON = deployment.getJSON()
  const db = context.getWorkspaceDB()

  let deploymentDoc
  try {
    // theres only one deployment doc per app database
    deploymentDoc = await db.get<any>(DocumentType.DEPLOYMENTS)
  } catch (err) {
    deploymentDoc = { _id: DocumentType.DEPLOYMENTS, history: {} }
  }

  const deploymentId = deploymentJSON._id

  // first time deployment
  if (!deploymentDoc.history[deploymentId])
    deploymentDoc.history[deploymentId] = {}

  deploymentDoc.history[deploymentId] = {
    ...deploymentDoc.history[deploymentId],
    ...deploymentJSON,
    updatedAt: Date.now(),
  }

  await db.put(deploymentDoc)
  deployment.fromJSON(deploymentDoc.history[deploymentId])
  return deployment
}

async function applyPendingColumnRenames(
  workspaceId: string
): Promise<Table[]> {
  return await context.doInWorkspaceContext(workspaceId, async () => {
    const db = context.getWorkspaceDB()
    const tables = await sdk.tables.getAllInternalTables()
    const updatedTables: Table[] = []

    for (let table of tables) {
      if (table._deleted) {
        continue
      }
      const pendingColumnRenames = table.pendingColumnRenames
      if (!pendingColumnRenames?.length) {
        continue
      }

      for (const rename of pendingColumnRenames) {
        const tableToUpdate: Table = {
          ...table,
          schema: { ...table.schema },
        }

        const existingNew = tableToUpdate.schema[rename.updated]
        const existingOld = tableToUpdate.schema[rename.old]

        // If the updatd column schema doesn't exist (replication left the old schema),
        // use the old column schema to the new name so the rename can complete.
        if (!existingNew && existingOld) {
          tableToUpdate.schema[rename.updated] = {
            ...existingOld,
            name: rename.updated,
          }
          delete tableToUpdate.schema[rename.old]
        }

        await sdk.tables.update(tableToUpdate, rename)
        table = await sdk.tables.getTable(table._id!)
      }

      const updatedTable: Table = { ...table, pendingColumnRenames: [] }
      const putResult = await db.put(updatedTable)
      const persistedTable: Table = { ...updatedTable, _rev: putResult.rev }
      updatedTables.push(persistedTable)
    }

    return updatedTables
  })
}

const getRevisionNumber = (rev?: string) =>
  parseInt(rev?.split("-")?.[0] || "0", 10)

async function clearPendingColumnRenames(workspaceId: string) {
  await context.doInWorkspaceContext(workspaceId, async () => {
    const db = context.getWorkspaceDB()
    const tables = await sdk.tables.getAllInternalTables()

    for (const table of tables) {
      if (table._deleted) {
        continue
      }
      if (!table.pendingColumnRenames?.length) {
        continue
      }
      const updatedTable: Table = {
        ...table,
        pendingColumnRenames: [],
      }
      await db.put(updatedTable)
    }
  })
}

export async function fetchDeployments(
  ctx: UserCtx<void, FetchDeploymentResponse>
) {
  try {
    const db = context.getWorkspaceDB()
    const deploymentDoc = await db.get(DocumentType.DEPLOYMENTS)
    const { updated, deployments } = await checkAllDeployments(deploymentDoc)
    if (updated) {
      await db.put(deployments)
    }
    ctx.body = deployments.history
      ? Object.values(deployments.history).reverse()
      : []
  } catch (err) {
    ctx.body = []
  }
}

export async function deploymentProgress(
  ctx: UserCtx<void, DeploymentProgressResponse>
) {
  try {
    const db = context.getWorkspaceDB()
    const deploymentDoc = await db.get<DeploymentDoc>(DocumentType.DEPLOYMENTS)
    if (!deploymentDoc.history?.[ctx.params.deploymentId]) {
      ctx.throw(404, "No deployment found")
    }
    ctx.body = deploymentDoc.history?.[ctx.params.deploymentId]
  } catch (err) {
    ctx.throw(
      500,
      `Error fetching data for deployment ${ctx.params.deploymentId}`
    )
  }
}

export async function publishStatus(ctx: UserCtx<void, PublishStatusResponse>) {
  const { workspaceApps, tables } = await sdk.deployment.status()

  ctx.body = {
    workspaceApps,
    tables,
  }
}

export const publishWorkspace = async function (
  ctx: UserCtx<PublishWorkspaceRequest, PublishWorkspaceResponse>
) {
  if (ctx.request.body?.automationIds || ctx.request.body?.workspaceAppIds) {
    throw new errors.NotImplementedError(
      "Publishing resources by ID not currently supported"
    )
  }
  const seedProductionTables = ctx.request.body?.seedProductionTables
  let deployment = new Deployment()
  deployment.setStatus(DeploymentStatus.PENDING)
  deployment = await storeDeploymentHistory(deployment)
  let tablesToSync: "all" | string[] | undefined
  if (env.isTest()) {
    // TODO: a lot of tests depend on old behaviour of data being published
    // we could do with going through the tests and updating them all to write
    // data to production instead of development - but doesn't improve test
    // quality - so keep publishing data in dev for now
    tablesToSync = "all"
  } else if (seedProductionTables) {
    try {
      tablesToSync = await sdk.tables.listEmptyProductionTables()
    } catch (e) {
      tablesToSync = []
    }
  }

  const appId = context.getWorkspaceId()!

  try {
    const publish = async () => {
      let replication
      try {
        const devId = dbCore.getDevWorkspaceID(appId)
        const prodId = dbCore.getProdWorkspaceID(appId)

        if (!(await sdk.workspaces.isWorkspacePublished(prodId))) {
          const allWorkspaceApps = await sdk.workspaceApps.fetch()
          for (const workspaceApp of allWorkspaceApps) {
            if (workspaceApp.disabled !== undefined) {
              continue
            }

            await sdk.workspaceApps.update({ ...workspaceApp, disabled: true })
          }
        }

        const isPublished = await sdk.workspaces.isWorkspacePublished(prodId)
        const config = {
          source: devId,
          target: prodId,
        }
        replication = new dbCore.Replication(config)
        const devDb = context.getDevWorkspaceDB()

        await devDb.compact()
        await replication.replicate(
          replication.appReplicateOpts({
            isCreation: !isPublished,
            tablesToSync,
            // don't use checkpoints, this can stop previously ignored data being replicated
            checkpoint: !seedProductionTables,
          })
        )

        const updatedProdTables = await applyPendingColumnRenames(prodId)

        // Keep development revs aligned with production after renaming, so the
        // next publish doesn't see production ahead and delete / tombstone the doc.
        if (updatedProdTables.length > 0) {
          await context.doInWorkspaceContext(devId, async () => {
            const devDb = context.getWorkspaceDB()
            for (const prodTable of updatedProdTables) {
              try {
                const devTable = await devDb.tryGet<Table>(prodTable._id!)
                if (!devTable) {
                  console.warn(
                    `Failed to get development table for table ${prodTable._id} when applying column renames`
                  )
                  continue
                }

                const prodRevNum = getRevisionNumber(prodTable._rev)
                let devRevNum = getRevisionNumber(devTable._rev)

                let docForPut: Table = {
                  ...prodTable,
                  _rev: devTable._rev,
                }

                // Bump dev revisions until dev is at least prod (avoids prod-ahead).
                while (devRevNum < prodRevNum) {
                  const res = await devDb.put(docForPut)
                  docForPut = { ...docForPut, _rev: res.rev }
                  devRevNum = getRevisionNumber(res.rev)
                }

                // Ensure final content is written with the latest dev rev (handles equal case).
                await devDb.put(docForPut)
              } catch (err) {
                console.warn(
                  `Failed to update development table with production table 
                  revision when applying column renames for table ${prodTable._id}: ${err}`
                )
              }
            }
          })
        }

        await clearPendingColumnRenames(devId)

        const db = context.getProdWorkspaceDB()
        const appDoc = await sdk.workspaces.metadata.tryGet({
          production: false,
        })
        if (!appDoc) {
          throw new Error(
            "Unable to publish - cannot retrieve development app metadata"
          )
        }
        const prodAppDoc = await sdk.workspaces.metadata.tryGet({
          production: true,
        })
        if (prodAppDoc) {
          appDoc._rev = prodAppDoc._rev
        } else {
          delete appDoc._rev
        }

        deployment.appUrl = appDoc.url
        appDoc.appId = prodId
        appDoc.instance._id = prodId
        const [workspaceApps, tables] = await Promise.all([
          sdk.workspaceApps.fetch(),
          sdk.tables.getAllInternalTables(),
        ])
        const workspaceAppIds = workspaceApps.map(app => app._id!)
        const tableIds = tables.map(table => table._id!)
        const fullMap = [...(workspaceAppIds ?? []), ...(tableIds ?? [])]
        appDoc.resourcesPublishedAt = {
          ...prodAppDoc?.resourcesPublishedAt,
          ...Object.fromEntries(
            fullMap.map(id => [id, new Date().toISOString()])
          ),
        }
        delete appDoc.automationErrors
        await db.put(appDoc)
        await cache.workspace.invalidateWorkspaceMetadata(prodId)

        return { app: appDoc, prodWorkspaceId: prodId }
      } finally {
        if (replication) {
          await replication.close()
        }
      }
    }
    await publish()
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Unknown error"
    deployment.setStatus(DeploymentStatus.FAILURE, message)
    await storeDeploymentHistory(deployment)
    throw new Error(`Deployment Failed: ${message}`, { cause: error })
  }

  deployment.setStatus(DeploymentStatus.SUCCESS)
  await storeDeploymentHistory(deployment)

  ctx.body = deployment
  builderSocket?.emitAppPublish(ctx)
}
