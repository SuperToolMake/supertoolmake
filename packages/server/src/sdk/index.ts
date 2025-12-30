import * as dev from "./dev"
import { default as users } from "./users"
import * as common from "./workspace/common"
import { default as datasources } from "./workspace/datasources"
import { default as deployment } from "./workspace/deployment"
import * as workspace from "./workspace/favourites"
import { default as links } from "./workspace/links"
import * as navigation from "./workspace/navigation"
import * as oauth2 from "./workspace/oauth2"
import * as permissions from "./workspace/permissions"
import { default as queries } from "./workspace/queries"
import * as resources from "./workspace/resources"
import { default as rows } from "./workspace/rows"
import * as screens from "./workspace/screens"
import { default as tables } from "./workspace/tables"
import * as views from "./workspace/views"
import * as workspaceApps from "./workspace/workspaceApps"
import { default as workspaces } from "./workspace/workspaces"

const sdk = {
  tables,
  workspaces,
  rows,
  users,
  datasources,
  queries,
  screens,
  views,
  permissions,
  links,
  common,
  oauth2,
  workspaceApps,
  navigation,
  resources,
  deployment,
  dev,
  workspace,
}

// default export for TS
export default sdk
