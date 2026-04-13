import type { Database, Installation, Workspace } from "@supertoolmake/types"
import { bustCache, CacheKey, TTL, withCache } from "./cache/generic"
import { doWithDB, getAllWorkspaces, StaticDatabases } from "./db"
import { DocumentType } from "./db/utils"
import environment from "./environment"
import { logAlert } from "./logging"
import { newid } from "./utils"

export const getInstall = async (): Promise<Installation> => {
  return withCache(CacheKey.INSTALLATION, TTL.ONE_DAY, getInstallFromDB, {
    useTenancy: false,
  })
}
async function createInstallDoc(platformDb: Database) {
  const install: Installation = {
    _id: StaticDatabases.PLATFORM_INFO.docs.install,
    installId: newid(),
    version: environment.VERSION,
  }
  try {
    const resp = await platformDb.put(install)
    install._rev = resp.rev
    return install
  } catch (err: any) {
    if (err.status === 409) {
      return getInstallFromDB()
    } else {
      throw err
    }
  }
}

export const getInstallFromDB = async (): Promise<Installation> => {
  return doWithDB(StaticDatabases.PLATFORM_INFO.name, async (platformDb: any) => {
    let install: Installation
    try {
      install = await platformDb.get(StaticDatabases.PLATFORM_INFO.docs.install)
    } catch (e: any) {
      if (e.status === 404) {
        install = await createInstallDoc(platformDb)
      } else {
        throw e
      }
    }
    return install
  })
}

const updateVersion = async (version: string): Promise<boolean> => {
  try {
    await doWithDB(StaticDatabases.PLATFORM_INFO.name, async (platformDb: any) => {
      const install = await getInstall()
      install.version = version
      await platformDb.put(install)
      await bustCache(CacheKey.INSTALLATION)
    })
  } catch (e: any) {
    if (e.status === 409) {
      // do nothing - version has already been updated
      // likely in clustered environment
      return false
    }
    throw e
  }
  return true
}

export const checkInstallVersion = async (): Promise<void> => {
  const install = await getInstall()

  const currentVersion = install.version
  const newVersion = environment.VERSION

  try {
    if (currentVersion !== newVersion) {
      await updateVersion(newVersion)
    }
  } catch (err: any) {
    if (err?.message?.includes("Invalid Version")) {
      logAlert(`Invalid version "${newVersion}" - is it semver?`)
    } else {
      logAlert("Failed to retrieve version", err)
    }
  }
}

export const checkWorkspaceClientVersions = async (): Promise<void> => {
  const newClientVersion = environment.getClientVersion()
  const workspaces = await getAllWorkspaces({ dev: true })

  for (const workspace of workspaces) {
    const currentVersion = workspace.version
    if (currentVersion && currentVersion !== newClientVersion) {
      try {
        await doWithDB(workspace._id!, async (db: any) => {
          const app = await db.get<Workspace>(DocumentType.WORKSPACE_METADATA)
          app.version = newClientVersion
          app.revertableVersion = undefined
          await db.put(app)
        })
      } catch (err) {
        logAlert(`Failed to update client version for workspace ${workspace._id}`, err)
      }
    }
  }
}
