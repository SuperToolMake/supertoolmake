import { context, db } from "@budibase/backend-core"
import type {
  ClearBackupErrorRequest,
  ClearBackupErrorResponse,
  Ctx,
  ExportWorkspaceDumpRequest,
  ExportWorkspaceDumpResponse,
  UserCtx,
  Workspace
} from "@budibase/types"
import { DocumentType } from "@budibase/types"
import sdk from "../../sdk"

export async function exportWorkspaceDump(
  ctx: Ctx<ExportWorkspaceDumpRequest, ExportWorkspaceDumpResponse>
) {
  const { appId: workspaceId } = ctx.query as any
  const { encryptPassword } = ctx.request.body

  const [workspace] = await db.getWorkspacesByIDs([workspaceId])
  const workspaceName = workspace.name

  // remove the 120 second limit for the request
  ctx.req.setTimeout(0)

  const extension = encryptPassword ? "enc.tar.gz" : "tar.gz"
  const backupIdentifier = `${workspaceName}-export-${Date.now()}.${extension}`
  ctx.attachment(backupIdentifier)
  ctx.body = await sdk.backups.streamExportWorkspace({
    workspaceId,
    encryptPassword,
  })

  await context.doInWorkspaceContext(workspaceId, async () => {
    const appDb = context.getWorkspaceDB()
    const app = await appDb.get<Workspace>(DocumentType.WORKSPACE_METADATA)
  })
}

export async function clearBackupError(
  ctx: UserCtx<ClearBackupErrorRequest, ClearBackupErrorResponse>
) {
  const { backupId, appId } = ctx.request.body
  await context.doInWorkspaceContext(appId, async () => {
    await sdk.backups.clearErrors(backupId)
  })

  ctx.body = { message: `Backup errors cleared.` }
}
