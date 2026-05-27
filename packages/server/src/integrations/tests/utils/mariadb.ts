import { generator, type testContainerUtils } from "@supertoolmake/backend-core/tests"
import { type Datasource, SourceName } from "@supertoolmake/types"
import { GenericContainer, Wait } from "testcontainers"
import { startContainer } from "."
import { MARIADB_IMAGE } from "./images"
import { knexClient } from "./mysql"

let ports: Promise<testContainerUtils.Port[]>

export async function getDatasource(): Promise<Datasource> {
  if (!ports) {
    ports = startContainer(
      new GenericContainer(MARIADB_IMAGE)
        .withExposedPorts(3306)
        .withEnvironment({ MARIADB_ROOT_PASSWORD: "password" })
        .withWaitStrategy(
          Wait.forAll([
            Wait.forLogMessage("mariadbd: ready for connections", 2),
            Wait.forSuccessfulCommand(`/usr/local/bin/healthcheck.sh --innodb_initialized`),
          ]).withStartupTimeout(20000)
        )
    )
  }

  const port = (await ports).find((x) => x.container === 3306)?.host
  if (!port) {
    throw new Error("MariaDB port not found")
  }

  const config = {
    host: "127.0.0.1",
    port,
    user: "root",
    password: "password",
    database: "mysql",
  }

  const datasource = {
    type: "datasource_plus",
    source: SourceName.MYSQL,
    plus: true,
    config,
  }

  const database = generator.guid().replaceAll("-", "")
  const client = await knexClient(datasource)
  await client.raw(`CREATE DATABASE \`${database}\``)
  datasource.config.database = database
  return datasource
}
