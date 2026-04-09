import type {
  AdminOnlyUser,
  AdminUser,
  BuilderUser,
  SSOAuthDetails,
  SSOUser,
  User,
} from "@supertoolmake/types"
import { tenant } from "."
import { uuid } from "./common"
import { generator } from "./generator"
import { authDetails } from "./sso"

export const newEmail = () => {
  return `${uuid()}@example.com`
}

export const user = (userProps?: Partial<Omit<User, "userId">>): User => {
  const userId = userProps?._id
  return {
    _id: userId,
    userId,
    email: newEmail(),
    password: "password123!",
    roles: { app_test: "admin" },
    firstName: generator.first(),
    lastName: generator.last(),
    tenantId: tenant.id(),
    ...userProps,
  }
}

export const adminUser = (userProps?: any): AdminUser => {
  return {
    ...user(userProps),
    admin: {
      global: true,
    },
    builder: {
      global: true,
    },
  }
}

export const adminOnlyUser = (userProps?: any): AdminOnlyUser => {
  return {
    ...user(userProps),
    admin: {
      global: true,
    },
  }
}

export const builderUser = (userProps?: Partial<User>): BuilderUser => {
  return {
    ...user(userProps),
    builder: {
      global: true,
    },
  }
}

export const appBuilderUser = (appId: string, userProps?: any): BuilderUser => {
  return {
    ...user(userProps),
    builder: {
      apps: [appId],
    },
  }
}

export function ssoUser(opts: { user?: any; details?: SSOAuthDetails } = {}): SSOUser {
  const base = user(opts.user)
  delete base.password
  const details = opts.details ?? authDetails(base)

  return {
    ...base,
    forceResetPassword: false,
    oauth2: details.oauth2,
    provider: details.provider,
    providerType: details.providerType,
  }
}
