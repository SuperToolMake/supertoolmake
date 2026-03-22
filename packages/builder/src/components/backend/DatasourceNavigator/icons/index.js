import Custom from "./Custom.svelte"
import Firebase from "./Firebase.svelte"
import MongoDB from "./MongoDB.svelte"
import MySQL from "./MySQL.svelte"
import Postgres from "./Postgres.svelte"
import Redis from "./Redis.svelte"
import Rest from "./Rest.svelte"
import SqlServer from "./SQLServer.svelte"
import MinIO from "./MinIO.svelte"

const ICONS = {
  POSTGRES: Postgres,
  MONGODB: MongoDB,
  SQL_SERVER: SqlServer,
  MYSQL: MySQL,
  REST: Rest,
  FIRESTORE: Firebase,
  REDIS: Redis,
  MINIO: MinIO,
  CUSTOM: Custom,
}

export default ICONS
