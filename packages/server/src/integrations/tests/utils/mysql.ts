import { generator, type testContainerUtils } from "@supertoolmake/backend-core/tests"
import { type Datasource, SourceName } from "@supertoolmake/types"
import knex, { type Knex } from "knex"
import { GenericContainer, Wait } from "testcontainers"
import { startContainer } from "."
import { MYSQL_IMAGE } from "./images"

let ports: Promise<testContainerUtils.Port[]>

export async function getDatasource(): Promise<Datasource> {
  if (!ports) {
    ports = startContainer(
      new GenericContainer(MYSQL_IMAGE)
        .withExposedPorts(3306)
        .withEnvironment({ MYSQL_ROOT_PASSWORD: "password" })
        .withWaitStrategy(
          Wait.forAll([
            Wait.forLogMessage("/usr/sbin/mysqld: ready for connections", 2),
            Wait.forSuccessfulCommand(`mysqladmin ping -h localhost -P 3306 -u root -ppassword`),
          ]).withStartupTimeout(20000)
        )
    )
  }

  const port = (await ports).find((x) => x.container === 3306)?.host
  if (!port) {
    throw new Error("MySQL port not found")
  }

  const datasource: Datasource = {
    type: "datasource_plus",
    source: SourceName.MYSQL,
    plus: true,
    config: {
      host: "127.0.0.1",
      port,
      user: "root",
      password: "password",
      database: "mysql",
    },
  }

  const database = generator.guid().replaceAll("-", "")
  const client = await knexClient(datasource)
  await client.raw(`CREATE DATABASE \`${database}\``)
  datasource.config!.database = database
  return datasource
}

export async function knexClient(ds: Datasource, opts?: Knex.Config) {
  if (!ds.config) {
    throw new Error("Datasource config is missing")
  }
  if (ds.source !== SourceName.MYSQL) {
    throw new Error("Datasource source is not MySQL")
  }

  return knex({
    client: "mysql2",
    connection: ds.config,
    ...opts,
  })
}
