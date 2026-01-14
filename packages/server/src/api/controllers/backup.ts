import { context, db } from "@budibase/backend-core"
import {
  ClearBackupErrorRequest,
  ClearBackupErrorResponse,
  Ctx,
  ExportWorkspaceDumpRequest,
  ExportWorkspaceDumpResponse,
  UserCtx,
} from "@budibase/types"
import sdk from "../../sdk"

export async function exportAppDump(
  ctx: Ctx<ExportWorkspaceDumpRequest, ExportWorkspaceDumpResponse>
) {
  const { appId } = ctx.query as any
  const { encryptPassword } = ctx.request.body
  const [workspace] = await db.getWorkspacesByIDs([appId])
  const workspaceName = workspace.name

  // remove the 120 second limit for the request
  ctx.req.setTimeout(0)

  const extension = encryptPassword ? "enc.tar.gz" : "tar.gz"
  const backupIdentifier = `${workspaceName}-export-${new Date().getTime()}.${extension}`
  ctx.attachment(backupIdentifier)
  ctx.body = await sdk.backups.streamExportApp({
    appId,
    encryptPassword,
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
