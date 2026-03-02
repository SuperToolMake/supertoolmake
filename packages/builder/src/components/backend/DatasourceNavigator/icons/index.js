import Postgres from "./Postgres.svelte"
import Elasticsearch from "./Elasticsearch.svelte"
import MongoDB from "./MongoDB.svelte"
import CouchDB from "./CouchDB.svelte"
import S3 from "./S3.svelte"
import SqlServer from "./SQLServer.svelte"
import MySQL from "./MySQL.svelte"
import Rest from "./Rest.svelte"
import Oracle from "./Oracle.svelte"
import Firebase from "./Firebase.svelte"
import Redis from "./Redis.svelte"
import Custom from "./Custom.svelte"

const ICONS = {
  POSTGRES: Postgres,
  MONGODB: MongoDB,
  ELASTICSEARCH: Elasticsearch,
  COUCHDB: CouchDB,
  SQL_SERVER: SqlServer,
  S3: S3,
  MYSQL: MySQL,
  REST: Rest,
  ORACLE: Oracle,
  FIRESTORE: Firebase,
  REDIS: Redis,
  CUSTOM: Custom,
}

export default ICONS
