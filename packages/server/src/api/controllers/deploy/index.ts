import { cache, context, db as dbCore, errors } from "@supertoolmake/backend-core"
import {
  type DeploymentDoc,
  type DeploymentProgressResponse,
  DeploymentStatus,
  type FetchDeploymentResponse,
  type PublishStatusResponse,
  type PublishTableRequest,
  type PublishTableResponse,
  type PublishWorkspaceRequest,
  type PublishWorkspaceResponse,
  type UserCtx,
} from "@supertoolmake/types"
import { DocumentType } from "../../../db/utils"
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
  } catch {
    deploymentDoc = { _id: DocumentType.DEPLOYMENTS, history: {} }
  }

  const deploymentId = deploymentJSON._id

  // first time deployment
  if (!deploymentDoc.history[deploymentId]) deploymentDoc.history[deploymentId] = {}

  deploymentDoc.history[deploymentId] = {
    ...deploymentDoc.history[deploymentId],
    ...deploymentJSON,
    updatedAt: Date.now(),
  }

  await db.put(deploymentDoc)
  deployment.fromJSON(deploymentDoc.history[deploymentId])
  return deployment
}

export async function fetchDeployments(ctx: UserCtx<void, FetchDeploymentResponse>) {
  try {
    const db = context.getWorkspaceDB()
    const deploymentDoc = await db.get(DocumentType.DEPLOYMENTS)
    const { updated, deployments } = await checkAllDeployments(deploymentDoc)
    if (updated) {
      await db.put(deployments)
    }
    ctx.body = deployments.history ? Object.values(deployments.history).reverse() : []
  } catch {
    ctx.body = []
  }
}

export async function deploymentProgress(ctx: UserCtx<void, DeploymentProgressResponse>) {
  try {
    const db = context.getWorkspaceDB()
    const deploymentDoc = await db.get<DeploymentDoc>(DocumentType.DEPLOYMENTS)
    if (!deploymentDoc.history?.[ctx.params.deploymentId]) {
      ctx.throw(404, "No deployment found")
    }
    ctx.body = deploymentDoc.history?.[ctx.params.deploymentId]
  } catch {
    ctx.throw(500, `Error fetching data for deployment ${ctx.params.deploymentId}`)
  }
}

export async function publishStatus(ctx: UserCtx<void, PublishStatusResponse>) {
  const { workspaceApps, tables } = await sdk.deployment.status()

  ctx.body = {
    workspaceApps,
    tables,
  }
}

type PublishContext = UserCtx<
  PublishWorkspaceRequest | PublishTableRequest,
  PublishWorkspaceResponse | PublishTableResponse
>

export const publishWorkspaceInternal = async (ctx: PublishContext) => {
  let deployment = new Deployment()
  deployment.setStatus(DeploymentStatus.PENDING)
  deployment = await storeDeploymentHistory(deployment)
  let tablesToSync: "all" | string[] | undefined

  const appId = context.getWorkspaceId()!

  try {
    const publish = async () => {
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
      const replication = new dbCore.Replication(config)

      await replication.replicate({
        isCreation: !isPublished,
        tablesToSync,
      })

      const db = context.getProdWorkspaceDB()
      const appDoc = await sdk.workspaces.metadata.tryGet({
        production: false,
      })
      if (!appDoc) {
        throw new Error("Unable to publish - cannot retrieve development app metadata")
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
      const workspaceAppIds = workspaceApps.map((app) => app._id!)
      const tableIds = tables.map((table) => table._id!)
      const fullMap = [...(workspaceAppIds ?? []), ...(tableIds ?? [])]
      appDoc.resourcesPublishedAt = {
        ...prodAppDoc?.resourcesPublishedAt,
        ...Object.fromEntries(fullMap.map((id) => [id, new Date().toISOString()])),
      }
      delete appDoc.automationErrors
      await db.put(appDoc)
      await cache.workspace.invalidateWorkspaceMetadata(prodId)

      return { app: appDoc, prodWorkspaceId: prodId }
    }
    await publish()
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error"
    deployment.setStatus(DeploymentStatus.FAILURE, message)
    await storeDeploymentHistory(deployment)
    throw new Error(`Deployment Failed: ${message}`, { cause: error })
  }

  deployment.setStatus(DeploymentStatus.SUCCESS)
  await storeDeploymentHistory(deployment)

  ctx.body = deployment
  builderSocket?.emitAppPublish(ctx)
  return deployment
}

export const publishWorkspace = async (
  ctx: UserCtx<PublishWorkspaceRequest, PublishWorkspaceResponse>
) => {
  if (ctx.request.body?.automationIds || ctx.request.body?.workspaceAppIds) {
    throw new errors.NotImplementedError("Publishing resources by ID not currently supported")
  }

  ctx.body = await publishWorkspaceInternal(ctx)
}
