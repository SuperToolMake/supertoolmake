export * as auth from "./auth"
export * as blacklist from "./blacklist"
export * as cache from "./cache"
export * as configs from "./configs"
export * as constants from "./constants"
export * as context from "./context"
export * as csv from "./csv"
export * as db from "./db"
export * as docIds from "./docIds"
export * from "./Endpoint"
export { default as env, setEnv, withEnv } from "./environment"
export * as errors from "./errors"
export * as installation from "./installation"
export * as logging from "./logging"
export * as middleware from "./middleware"
export * as objectStore from "./objectStore"
export * as platform from "./platform"
export * as queue from "./queue"
export * as redis from "./redis"
export { Client as RedisClient } from "./redis"
export * as locks from "./redis/redlockImpl"
export * as security from "./security"
export * as encryption from "./security/encryption"
export * as permissions from "./security/permissions"
export * as roles from "./security/roles"
export * as sessions from "./security/sessions"
export * as sql from "./sql"
export * as timers from "./timers"
export * as users from "./users"
export * as userUtils from "./users/utils"
export * as utils from "./utils"
export * from "./utils/Duration"
export * as warnings from "./warnings"

// Add context to tenancy for backwards compatibility
// only do this for external usages to prevent internal
// circular dependencies
import * as context from "./context"
import * as _tenancy from "./tenancy"

export const tenancy = {
  ..._tenancy,
  ...context,
}

// expose constants directly
export * from "./constants"
// expose error classes directly
export * from "./errors"
// expose warning classes directly
export * from "./warnings"

// expose package init function
import * as db from "./db"

export const init = (opts: any = {}) => {
  db.init(opts.db)
}
