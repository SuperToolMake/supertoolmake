import {
  type DatasourcePlus,
  type Integration,
  type IntegrationBase,
  SourceName,
} from "@budibase/types"
import cloneDeep from "lodash/cloneDeep"
import firebase from "./firebase"
import sqlServer from "./microsoftSqlServer"
import mongodb from "./mongodb"
import mysql from "./mysql"
import postgres from "./postgres"
import redis from "./redis"
import rest from "./rest"

const DEFINITIONS: Record<SourceName, Integration | undefined> = {
  [SourceName.POSTGRES]: postgres.schema,
  [SourceName.MONGODB]: mongodb.schema,
  [SourceName.SQL_SERVER]: sqlServer.schema,
  [SourceName.MYSQL]: mysql.schema,
  [SourceName.REST]: rest.schema,
  [SourceName.FIRESTORE]: firebase.schema,
  [SourceName.REDIS]: redis.schema,
}

type IntegrationBaseConstructor = new (...args: any[]) => IntegrationBase
type DatasourcePlusConstructor = new (...args: any[]) => DatasourcePlus

export function isDatasourcePlusConstructor(
  integration: IntegrationBaseConstructor
): integration is DatasourcePlusConstructor {
  return Boolean(integration.prototype.query)
}

const INTEGRATIONS: Record<SourceName, IntegrationBaseConstructor | undefined> = {
  [SourceName.POSTGRES]: postgres.integration,
  [SourceName.MONGODB]: mongodb.integration,
  [SourceName.SQL_SERVER]: sqlServer.integration,
  [SourceName.MYSQL]: mysql.integration,
  [SourceName.REST]: rest.integration,
  [SourceName.FIRESTORE]: firebase.integration,
  [SourceName.REDIS]: redis.integration,
}

export async function getDefinition(source: SourceName): Promise<Integration | undefined> {
  // check if its integrated, faster
  const definition = DEFINITIONS[source]
  if (definition) {
    return definition
  }
  const allDefinitions = await getDefinitions()
  return allDefinitions[source]
}

export async function getDefinitions() {
  return {
    ...cloneDeep(DEFINITIONS),
  }
}

export async function getIntegration(integration: SourceName): Promise<IntegrationBaseConstructor> {
  if (INTEGRATIONS[integration]) {
    return INTEGRATIONS[integration]
  }
  throw new Error(`No datasource implementation found called: "${integration}"`)
}

export default {
  getDefinitions,
  getIntegration,
}
