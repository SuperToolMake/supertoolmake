import fs from "node:fs"
import path from "node:path"
import { BadRequestError, configs, context, objectStore } from "@budibase/backend-core"
import { InvalidFileExtensions } from "@budibase/shared-core"
import { processString } from "@budibase/string-templates"
import {
  type AppProps,
  type Ctx,
  DocumentType,
  type ProcessAttachmentResponse,
  type ServeAppResponse,
  type ServeBuilderPreviewResponse,
  type ServeClientLibraryResponse,
  type UserCtx,
  type Workspace,
} from "@budibase/types"
import send from "koa-send"
import { render } from "svelte/server"
import * as uuid from "uuid"
import { ObjectStoreBuckets } from "../../../constants"
import { getThemeVariables } from "../../../constants/themes"
import env from "../../../environment"
import sdk from "../../../sdk"
import { join } from "../../../utilities/centralPath"
import {
  loadHandlebarsFile,
  NODE_MODULES_PATH,
  shouldServeLocally,
} from "../../../utilities/fileSystem"
import AppComponent from "./templates/App.svelte"

const getUploadFilename = (file: unknown) => {
  if (!file || typeof file !== "object") {
    return
  }
  const upload = file as {
    originalFilename?: string | null
  }
  return upload.originalFilename || undefined
}

const getUploadPath = (file: unknown) => {
  if (!file || typeof file !== "object") {
    return
  }
  const upload = file as {
    filepath?: string
  }
  return upload.filepath
}

const getUploadMimeType = (file: unknown) => {
  if (!file || typeof file !== "object") {
    return
  }
  const upload = file as {
    mimetype?: string | null
  }
  return upload.mimetype || undefined
}

export const uploadFile = async (ctx: Ctx<void, ProcessAttachmentResponse>) => {
  const file = ctx.request?.files?.file
  if (!file) {
    throw new BadRequestError("No file provided")
  }

  const files = file && Array.isArray(file) ? Array.from(file) : [file]

  ctx.body = await Promise.all(
    files.map(async (file) => {
      const fileName = getUploadFilename(file)
      const filePath = getUploadPath(file)
      const rawMimeType = getUploadMimeType(file)

      if (!fileName) {
        throw new BadRequestError("Attempted to upload a file without a filename")
      }

      const extension = [...fileName.split(".")].pop()
      if (!extension) {
        throw new BadRequestError(
          `File "${fileName}" has no extension, an extension is required to upload a file`
        )
      }

      if (!env.SELF_HOSTED && InvalidFileExtensions.includes(extension.toLowerCase())) {
        throw new BadRequestError(`File "${fileName}" has an invalid extension: "${extension}"`)
      }

      // filenames converted to UUIDs so they are unique
      const processedFileName = `${uuid.v4()}.${extension}`

      const s3Key = `${context.getProdWorkspaceId()}/attachments/${processedFileName}`

      const response = await objectStore.upload({
        bucket: ObjectStoreBuckets.APPS,
        filename: s3Key,
        path: filePath,
        type: rawMimeType,
      })

      return {
        size: file.size,
        name: fileName,
        url: await objectStore.getAppFileUrl(s3Key),
        extension,
        key: response.Key!,
      }
    })
  )
}

export const serveApp = async (ctx: UserCtx<void, ServeAppResponse>) => {
  // No app ID found, cannot serve - return message instead
  const workspaceId = context.getWorkspaceId()
  if (!workspaceId) {
    ctx.body = "No content found - requires app ID"
    return
  }

  const bbHeaderEmbed = ctx.request.get("x-budibase-embed")?.toLowerCase() === "true"
  await Promise.all([configs.getSettingsConfigDoc()])
  // incase running direct from TS
  let appHbsPath = join(__dirname, "app.hbs")
  if (!fs.existsSync(appHbsPath)) {
    appHbsPath = join(__dirname, "templates", "app.hbs")
  }

  try {
    context.getWorkspaceDB({ skip_setup: true })

    const workspaceApp = await sdk.workspaceApps.getMatchedWorkspaceApp(ctx.url)

    const appInfo = await sdk.workspaces.metadata.get()
    const hideDevTools = Boolean(ctx.params.appUrl)
    const sideNav = workspaceApp?.navigation.navigation === "Left"
    const hideFooter = false
    const themeVariables = getThemeVariables(appInfo.theme)

    if (!env.isJest()) {
      /*
       * Server rendering in svelte sadly does not support type checking, the .render function
       * always will just expect "any" when typing - so it is pointless for us to type the
       * BudibaseApp.svelte file as we can never detect if the types are correct. To get around this
       * I've created a type which expects what the app will expect to receive.
       */
      const appName = workspaceApp?.name || `${appInfo.name}`
      const nonce = ctx.state.nonce || ""
      const props: AppProps = {
        title: appName,
        showSkeletonLoader: appInfo.features?.skeletonLoader ?? false,
        hideDevTools,
        sideNav,
        hideFooter,
        metaImage:
          "https://res.cloudinary.com/daog6scxm/image/upload/v1698759482/meta-images/plain-branded-meta-image-coral_ocxmgu.png",
        metaDescription: "",
        metaTitle: `${appName} - built with SuperToolMake`,
        clientCacheKey: await objectStore.getClientCacheKey(appInfo.version),
        favicon: "",
        nonce,
        workspaceId,
      }

      const { head, body } = await render(AppComponent, { props: { props } })
      const appHbs = loadHandlebarsFile(appHbsPath)

      const extraHead = ""

      ctx.body = await processString(appHbs, {
        head: `${head}${extraHead}`,
        body: body,
        css: `:root{${themeVariables}}`,
        appId: workspaceId,
        embedded: bbHeaderEmbed,
        nonce: ctx.state.nonce,
      })
    } else {
      // just return the app info for jest to assert on
      ctx.body = appInfo
    }
  } catch (error: any) {
    let msg = "An unknown error occurred"
    if (typeof error === "string") {
      msg = error
    } else if (error?.message) {
      msg = error.message
    }
    ctx.throw(500, msg)
  }
}

export const serveBuilderPreview = async (ctx: Ctx<void, ServeBuilderPreviewResponse>) => {
  const db = context.getWorkspaceDB({ skip_setup: true })
  const appInfo = await db.get<Workspace>(DocumentType.WORKSPACE_METADATA)

  if (!env.isJest()) {
    const appId = context.getWorkspaceId()
    const templateLoc = join(__dirname, "templates")
    const previewLoc = fs.existsSync(templateLoc) ? templateLoc : __dirname
    const previewHbs = loadHandlebarsFile(join(previewLoc, "preview.hbs"))
    const nonce = ctx.state.nonce || ""
    const props: any = {
      clientLibPath: await objectStore.clientLibraryUrl(appId!, appInfo.version),
      nonce,
    }

    ctx.body = await processString(previewHbs, props)
  } else {
    // just return the app info for jest to assert on
    ctx.body = { ...appInfo, builderPreview: true }
  }
}

function serveLocalFile(ctx: Ctx, fileName: string) {
  // Resolve via the package.json to avoid ESM/CJS export resolution issues
  // with require.resolve on packages that mark "type":"module".
  const pkgJsonPath = require.resolve("@budibase/client/package.json")
  const pkgDir = path.dirname(pkgJsonPath)
  const distFromPkg = join(pkgDir, "dist")
  //normal fallback
  const nodeModulesDist = join(NODE_MODULES_PATH, "@budibase", "client", "dist")
  const root = nodeModulesDist || distFromPkg
  return send(ctx, fileName, { root })
}

export const serveClientLibrary = async (ctx: Ctx<void, ServeClientLibraryResponse>) => {
  const workspaceId = context.getWorkspaceId()

  if (!workspaceId) {
    ctx.throw(400, "No workspace ID provided - cannot fetch client library.")
  }

  const serveLocally = await shouldServeLocally()
  if (!serveLocally) {
    const { stream } = await objectStore.getReadStream(
      ObjectStoreBuckets.APPS,
      objectStore.clientLibraryPath(workspaceId!)
    )
    ctx.body = stream
    ctx.set("Content-Type", "application/javascript")
  } else {
    return serveLocalFile(ctx, "budibase-client.js")
  }
}

export const serve3rdPartyFile = async (ctx: Ctx) => {
  const { file } = ctx.params

  const workspaceId = context.getWorkspaceId()
  if (!workspaceId) {
    ctx.throw(400, "No workspace ID provided - cannot fetch client library.")
  }

  const serveLocally = await shouldServeLocally()
  if (!serveLocally) {
    const { stream, contentType } = await objectStore.getReadStream(
      ObjectStoreBuckets.APPS,
      objectStore.client3rdPartyLibrary(workspaceId, file)
    )

    if (contentType) {
      ctx.set("Content-Type", contentType)
    }
    ctx.body = stream
  } else {
    return serveLocalFile(ctx, file)
  }
}

export const serveServiceWorker = async (ctx: Ctx) => {
  const serviceWorkerContent = `
    self.addEventListener('install', () => {
    self.skipWaiting();
  });`

  ctx.set("Content-Type", "application/javascript")
  ctx.body = serviceWorkerContent
}
