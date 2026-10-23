import { sdk } from "@supertoolmake/shared-core"
import type { ContextUser, User } from "@supertoolmake/types"

// extract from shared-core to make easily accessible from backend-core
export const isBuilder = sdk.users.isBuilder
export const isAdmin = sdk.users.isAdmin
export const isGlobalBuilder = sdk.users.isGlobalBuilder
export const isAdminOrBuilder = sdk.users.isAdminOrBuilder
export const hasAdminPermissions = sdk.users.hasAdminPermissions
export const hasBuilderPermissions = sdk.users.hasBuilderPermissions
export const hasAppBuilderPermissions = sdk.users.hasAppBuilderPermissions
export const isAdminOrWorkspaceBuilder = sdk.users.isAdminOrWorkspaceBuilder

export async function creatorsInList(users: (User | ContextUser)[]) {
  return users.map((user) => isCreatorSync(user))
}

// fetches groups if no provided, but is async and shouldn't be looped with
export async function isCreatorAsync(user: User | ContextUser) {
  return isCreatorSync(user)
}

export function isCreatorSync(user: User | ContextUser) {
  const isCreatorByUserDefinition = sdk.users.isCreator(user)
  return isCreatorByUserDefinition
}
