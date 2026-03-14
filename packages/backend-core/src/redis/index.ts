// Mimic the outer package export for usage in index.ts
// The outer exports can't be used as they now reference dist directly

export * as clients from "./init"
export { default as Client } from "./redis"
export * as locks from "./redlockImpl"
export * as utils from "./utils"
