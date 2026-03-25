import { Roles } from "../constants"

const RolePriorities = {
  [Roles.ADMIN]: 4,
  [Roles.CREATOR]: 3,
  [Roles.BASIC]: 2,
  [Roles.PUBLIC]: 1,
}

export const getRolePriority = (role) => {
  return RolePriorities[role] ?? 0
}
