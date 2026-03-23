import fs from "node:fs"
import fsp from "node:fs/promises"
import { join } from "node:path"
import { db as dbCore, encryption, objectStore } from "@budibase/backend-core"
import * as tar from "tar"
import { v4 as uuid } from "uuid"
import { ObjectStoreBuckets } from "../../../constants"
import {
  AUTOMATION_LOG_PREFIX,
  LINK_USER_METADATA_PREFIX,
  TABLE_ROW_PREFIX,
  USER_METDATA_PREFIX,
} from "../../../db/utils"
import { budibaseTempDir } from "../../../utilities/budibaseDir"
import { streamFile } from "../../../utilities/fileSystem"
import { ATTACHMENT_DIRECTORY, DB_EXPORT_FILE } from "./constants"

const MemoryStream = require("memorystream")

export interface DBDumpOpts {
  filter?: any
  exportPath?: string
}

export interface ExportOpts extends DBDumpOpts {
  tar?: boolean
  encryptPassword?: string
}

async function tarFilesToTmp(tmpDir: string, files: string[]) {
  const fileName = `${uuid()}.tar.gz`
  const exportFile = join(budibaseTempDir(), fileName)
  await tar.create(
    {
      gzip: true,
      file: exportFile,
      noDirRecurse: false,
      cwd: tmpDir,
    },
    files
  )
  return exportFile
}

/**
 * Exports a DB to either file or a variable (memory).
 * @param dbName the DB which is to be exported.
 * @param opts various options for the export, e.g. whether to stream,
 * a filter function or the name of the export.
 * @return either a readable stream or a string
 */
export async function exportDB(dbName: string, opts: DBDumpOpts = {}): Promise<string> {
  const exportOpts = {
    filter: opts?.filter,
    batch_size: 1000,
    batch_limit: 5,
    style: "main_only",
  } as const
  return dbCore.doWithDB(dbName, async (db) => {
    // Write the dump to file if required
    if (opts?.exportPath) {
      const path = opts?.exportPath
      const writeStream = fs.createWriteStream(path)
      await db.dump(writeStream, exportOpts)
      return path
    } else {
      // Stringify the dump in memory if required
      const memStream = new MemoryStream()
      let workspaceString = ""
      memStream.on("data", (chunk: any) => {
        workspaceString += chunk.toString()
      })
      await db.dump(memStream, exportOpts)
      return workspaceString
    }
  })
}

function defineFilter() {
  const ids = [USER_METDATA_PREFIX, LINK_USER_METADATA_PREFIX, AUTOMATION_LOG_PREFIX]
  ids.push(TABLE_ROW_PREFIX)

  return (doc: any) => !ids.map((key) => doc._id.includes(key)).reduce((prev, curr) => prev || curr)
}

/**
 * Local utility to back up the database state for an workspace, excluding global user
 * data or user relationships.
 * @param workspaceId The workspace to back up
 * @param config Config to send to export DB/attachment export
 * @returns either a string or a stream of the backup
 */
export async function exportWorkspace(workspaceId: string, config?: ExportOpts) {
  const prodWorkspaceId = dbCore.getProdWorkspaceID(workspaceId)
  const workspacePath = `${prodWorkspaceId}/`

  const toExclude = [/\/\..+/]

  toExclude.push(/\/attachments\/.*/)

  const tmpPath = await objectStore.retrieveDirectory(ObjectStoreBuckets.APPS, workspacePath, toExclude)

  const downloadedPath = join(tmpPath, workspacePath)
  if (fs.existsSync(downloadedPath)) {
    const allFiles = await fsp.readdir(downloadedPath)
    for (const file of allFiles) {
      const path = join(downloadedPath, file)
      // move out of workspace directory, simplify structure
      await fsp.rename(path, join(downloadedPath, "..", file))
    }
    // remove the old workspace directory created by object export
    await fsp.rmdir(downloadedPath)
  }
  // enforce an export of workspace DB to the tmp path
  const dbPath = join(tmpPath, DB_EXPORT_FILE)
  await exportDB(workspaceId, {
    filter: defineFilter(),
    exportPath: dbPath,
  })

  if (config?.encryptPassword) {
    const processDirectory = async (dirPath: string, relativePath = "") => {
      for (const file of await fsp.readdir(dirPath)) {
        const fullPath = join(dirPath, file)
        const relativeFilePath = relativePath ? join(relativePath, file) : file

        // skip the attachments - too big to encrypt
        if (file !== ATTACHMENT_DIRECTORY) {
          const stats = await fsp.lstat(fullPath)
          if (stats.isFile()) {
            await encryption.encryptFile({ dir: dirPath, filename: file }, config.encryptPassword!)
            await fsp.rm(fullPath)
          } else if (stats.isDirectory()) {
            await processDirectory(fullPath, relativeFilePath)
          }
        }
      }
    }

    await processDirectory(tmpPath)
  }

  // if tar requested, return where the tarball is
  if (config?.tar) {
    // now the tmpPath contains both the DB export and attachments, tar this
    const tarPath = await tarFilesToTmp(tmpPath, await fsp.readdir(tmpPath))
    // cleanup the tmp export files as tarball returned
    await fsp.rm(tmpPath, { recursive: true, force: true })

    return tarPath
  }
  // tar not requested, turn the directory where export is
  else {
    return tmpPath
  }
}

/**
 * Streams a backup of the database state for an app
 * @param appId The ID of the app which is to be backed up.
 * @param encryptPassword password for encrypting the export.
 * @returns a readable stream of the backup which is written in real time
 */
export async function streamExportWorkspace({
  workspaceId,
  encryptPassword,
}: {
  workspaceId: string
  encryptPassword?: string
}) {
  const tmpPath = await exportWorkspace(workspaceId, {
    tar: true,
    encryptPassword,
  })
  return streamFile(tmpPath)
}
