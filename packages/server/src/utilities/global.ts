import {
  cache,
  context,
  db as dbCore,
  roles,
  tenancy,
  users,
} from "@budibase/backend-core"
import { ContextUser, User, UserCtx } from "@budibase/types"
import cloneDeep from "lodash/cloneDeep"
import { getGlobalIDFromUserMetadataID } from "../db/utils"
import env from "../environment"

export async function processUser(
  user: ContextUser,
  opts: { appId?: string } = {}
) {
  if (!user || !user.roles) {
    return user
  }
  user = cloneDeep(user)
  delete user.password
  const workspaceId = opts.appId || context.getWorkspaceId()
  if (!workspaceId) {
    throw new Error("Unable to process user without app ID")
  }
  // if in a multi-tenancy environment and in wrong tenant make sure roles are never updated
  if (
    env.MULTI_TENANCY &&
    workspaceId &&
    !tenancy.isUserInWorkspaceTenant(workspaceId, user)
  ) {
    user = users.removePortalUserPermissions(user)
    user.roleId = roles.BUILTIN_ROLE_IDS.PUBLIC
    return user
  }
  // builders are always admins within the app
  if (users.isBuilder(user, workspaceId)) {
    user.roleId = roles.BUILTIN_ROLE_IDS.ADMIN
  }
  // try to get the role from the user list
  if (!user.roleId && workspaceId && user.roles) {
    user.roleId = user.roles[dbCore.getProdWorkspaceID(workspaceId)]
  }
  // final fallback, simply couldn't find a role - user must be public
  if (!user.roleId) {
    user.roleId = roles.BUILTIN_ROLE_IDS.PUBLIC
  }
  // remove the roles as it is now set
  delete user.roles
  return user
}

export async function getCachedSelf(
  ctx: UserCtx,
  appId: string
): Promise<ContextUser> {
  // this has to be tenant aware, can't depend on the context to find it out
  // running some middlewares before the tenancy causes context to break
  const user = await cache.user.getUser({
    userId: ctx.user!._id!,
  })
  return processUser(user, { appId })
}

export async function getRawGlobalUser(userId: string): Promise<User> {
  const db = tenancy.getGlobalDB()
  return db.get<User>(getGlobalIDFromUserMetadataID(userId))
}

export async function getGlobalUser(userId: string): Promise<ContextUser> {
  const appId = context.getWorkspaceId()
  let user = await getRawGlobalUser(userId)
  return processUser(user, { appId })
}

export async function getRawGlobalUsers(userIds?: string[]): Promise<User[]> {
  const db = tenancy.getGlobalDB()
  let globalUsers: User[]
  if (userIds) {
    globalUsers = await db.getMultiple<User>(userIds, { allowMissing: true })
  } else {
    globalUsers = (
      await db.allDocs<User>(
        dbCore.getGlobalUserParams(null, {
          include_docs: true,
        })
      )
    ).rows.map(row => row.doc!)
  }
  return globalUsers
    .filter(user => user != null)
    .map(user => {
      delete user.password
      delete user.forceResetPassword
      return user
    })
}

export async function getGlobalUsers(
  userIds?: string[]
): Promise<ContextUser[]> {
  const users = await getRawGlobalUsers(userIds)
  return Promise.all(users.map(user => processUser(user)))
}

export async function getGlobalUsersFromMetadata(users: ContextUser[]) {
  const globalUsers = await getGlobalUsers(users.map(user => user._id!))
  return users.map(user => {
    const globalUser = globalUsers.find(
      globalUser => globalUser && user._id?.includes(globalUser._id!)
    )
    return {
      ...globalUser,
      // doing user second overwrites the id and rev (always metadata)
      ...user,
    }
  })
}
