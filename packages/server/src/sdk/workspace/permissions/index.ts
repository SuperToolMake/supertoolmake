import { context, roles } from "@budibase/backend-core"
import {
  Database,
  PermissionLevel,
  PermissionSource,
  Role,
} from "@budibase/types"
import { getRoleParams } from "../../../db/utils"
import { removeFromArray } from "../../../utilities"
import {
  CURRENTLY_SUPPORTED_LEVELS,
  getBasePermissions,
} from "../../../utilities/security"

type ResourcePermissions = Record<
  string,
  { role: string; type: PermissionSource }
>

export const enum PermissionUpdateType {
  REMOVE = "remove",
  ADD = "add",
}

export async function getResourcePerms(
  resourceId: string
): Promise<ResourcePermissions> {
  const rolesList = await roles.getAllRoles()

  let permissions: ResourcePermissions = {}

  for (let level of CURRENTLY_SUPPORTED_LEVELS) {
    // update the various roleIds in the resource permissions
    for (let role of rolesList) {
      const rolePerms = roles.checkForRoleResourceArray(
        role.permissions || {},
        resourceId
      )
      if (rolePerms[resourceId]?.indexOf(level as PermissionLevel) > -1) {
        permissions[level] = {
          role: roles.getExternalRoleID(role._id!, role.version),
          type: PermissionSource.EXPLICIT,
        }
      }
    }
  }

  const basePermissions = Object.entries(
    getBasePermissions(resourceId)
  ).reduce<ResourcePermissions>((p, [level, role]) => {
    p[level] = { role, type: PermissionSource.BASE }
    return p
  }, {})
  return Object.assign(basePermissions, permissions)
}

export async function updatePermissionOnRole(
  {
    roleId,
    resourceId,
    level,
  }: { roleId: string; resourceId: string; level: PermissionLevel },
  updateType: PermissionUpdateType
) {
  const db = context.getWorkspaceDB()
  const remove = updateType === PermissionUpdateType.REMOVE
  const isABuiltin = roles.isBuiltin(roleId)
  const dbRoleId = roles.getDBRoleID(roleId)
  const dbRoles = await getAllDBRoles(db)
  const docUpdates: Role[] = []

  // the permission is for a built in, make sure it exists
  if (isABuiltin && !dbRoles.some(role => role._id === dbRoleId)) {
    const builtin = roles.getBuiltinRoles()[roleId]
    builtin._id = roles.getDBRoleID(builtin._id!)
    dbRoles.push(builtin)
  }

  // now try to find any roles which need updated, e.g. removing the
  // resource from another role and then adding to the new role
  for (let role of dbRoles) {
    let updated = false
    const rolePermissions: Record<string, PermissionLevel[]> = role.permissions
      ? role.permissions
      : {}
    // make sure its an array, also handle migrating
    if (
      !rolePermissions[resourceId] ||
      !Array.isArray(rolePermissions[resourceId])
    ) {
      rolePermissions[resourceId] =
        typeof rolePermissions[resourceId] === "string"
          ? [rolePermissions[resourceId] as unknown as PermissionLevel]
          : []
    }
    // handle the removal/updating the role which has this permission first
    // the updating (role._id !== dbRoleId) is required because a resource/level can
    // only be permitted in a single role (this reduces hierarchy confusion and simplifies
    // the general UI for this, rather than needing to show everywhere it is used)
    if (
      (role._id !== dbRoleId || remove) &&
      rolePermissions[resourceId].indexOf(level) !== -1
    ) {
      removeFromArray(rolePermissions[resourceId], level)
      updated = true
    }
    // handle the adding, we're on the correct role, at it to this
    if (!remove && role._id === dbRoleId) {
      const set = new Set(rolePermissions[resourceId])
      rolePermissions[resourceId] = [...set.add(level)]
      updated = true
    }
    // handle the update, add it to bulk docs to perform at end
    if (updated) {
      role.permissions = rolePermissions
      docUpdates.push(role)
    }
  }

  const response = await db.bulkDocs(docUpdates)
  return response.map(resp => {
    const version = docUpdates.find(role => role._id === resp.id)?.version
    const _id = roles.getExternalRoleID(resp.id, version)
    return {
      _id,
      rev: resp.rev,
      error: resp.error,
      reason: resp.reason,
    }
  })
}

export async function setPermissions(
  resourceId: string,
  {
    writeRole,
    readRole,
  }: {
    writeRole: string
    readRole: string
  }
) {
  await updatePermissionOnRole(
    { roleId: writeRole, resourceId, level: PermissionLevel.WRITE },
    PermissionUpdateType.ADD
  )
  await updatePermissionOnRole(
    { roleId: readRole, resourceId, level: PermissionLevel.READ },
    PermissionUpdateType.ADD
  )
}

// utility function to stop this repetition - permissions always stored under roles
export async function getAllDBRoles(db: Database) {
  const body = await db.allDocs<Role>(
    getRoleParams(null, {
      include_docs: true,
    })
  )
  return body.rows.map(row => row.doc!)
}
