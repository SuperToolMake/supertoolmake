import Custom from "./Custom.svelte"
import Firebase from "./Firebase.svelte"
import MongoDB from "./MongoDB.svelte"
import MySQL from "./MySQL.svelte"
import Postgres from "./Postgres.svelte"
import Redis from "./Redis.svelte"
import Rest from "./Rest.svelte"
import SqlServer from "./SQLServer.svelte"

const ICONS = {
  POSTGRES: Postgres,
  MONGODB: MongoDB,
  SQL_SERVER: SqlServer,
  MYSQL: MySQL,
  REST: Rest,
  FIRESTORE: Firebase,
  REDIS: Redis,
  CUSTOM: Custom,
}

export default ICONS
