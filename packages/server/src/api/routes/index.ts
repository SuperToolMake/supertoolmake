import Router from "@koa/router"
import { endpointGroupList } from "./endpointGroups"

// just need to import routes, they'll include themselves in the
// various groups they need to be included in
import "./apikeys"
import "./auth"
import "./backup"
import "./component"
import "./datasource"
import "./debug"
import "./deploy"
import "./dev"
import "./integration"
import "./layout"
import "./metadata"
import "./navigation"
import "./oauth2"
import "./ops"
import "./permission"
import "./query"
import "./resource"
import "./role"
import "./routing"
import "./row"
import "./screen"
import "./table"
import "./templates"
import "./user"
import "./workspace"
import "./workspaceApp"
import "./workspaceFavourites"

export { default as assetRoutes } from "./assets"
export { default as publicRoutes } from "./public"
export { default as staticRoutes } from "./static"

const endpoints = endpointGroupList.listAllEndpoints()

const appRoutes = new Router()
for (let endpoint of endpoints) {
  endpoint.apply(appRoutes)
}

export const mainRoutes: Router[] = [appRoutes]
