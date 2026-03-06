export interface MSSQLTablesResponse {
  TABLE_CATALOG: string
  TABLE_SCHEMA: string
  TABLE_NAME: string
  TABLE_TYPE: string
}

export interface MSSQLColumn {
  IS_COMPUTED: number
  IS_IDENTITY: number
  TABLE_CATALOG: string
  TABLE_SCHEMA: string
  TABLE_NAME: string
  COLUMN_NAME: string
  ORDINAL_POSITION: number
  COLUMN_DEFAULT: null | any
  IS_NULLABLE: "NO" | "YES"
  DATA_TYPE: string
  CHARACTER_MAXIMUM_LENGTH: null | number
  CHARACTER_OCTET_LENGTH: null | number
  NUMERIC_PRECISION: null | number
  NUMERIC_PRECISION_RADIX: null | number
  NUMERIC_SCALE: null | number
  DATETIME_PRECISION: null | string
  CHARACTER_SET_CATALOG: null | string
  CHARACTER_SET_SCHEMA: null | string
  CHARACTER_SET_NAME: null | string
  COLLATION_CATALOG: null | string
  COLLATION_SCHEMA: null | string
  COLLATION_NAME: null | string
  DOMAIN_CATALOG: null | string
  DOMAIN_SCHEMA: null | string
  DOMAIN_NAME: null | string
}

export interface PostgresColumn {
  table_catalog: string
  table_schema: string
  table_name: string
  column_name: string
  ordinal_position: number
  column_default: null | any
  is_nullable: "NO" | "YES"
  data_type: string
  character_maximum_length: null | number
  character_octet_length: null | number
  numeric_precision: null | number
  numeric_precision_radix: null | number
  numeric_scale: null | number
  datetime_precision: null | string
  interval_type: null | string
  interval_precision: null | string
  character_set_catalog: null | string
  character_set_schema: null | string
  character_set_name: null | string
  collation_catalog: null | string
  collation_schema: null | string
  collation_name: null | string
  domain_catalog: null | string
  domain_schema: null | string
  domain_name: null | string
  udt_catalog: string
  udt_schema: string
  udt_name: string
  scope_catalog: null | string
  scope_schema: null | string
  scope_name: null | string
  maximum_cardinality: null | string
  dtd_identifier: string
  is_self_referencing: "NO" | "YES"
  is_identity: "NO" | "YES"
  identity_generation: null | number
  identity_start: null | number
  identity_increment: null | number
  identity_maximum: null | number
  identity_minimum: null | number
  identity_cycle: "NO" | "YES"
  is_generated: "NEVER"
  generation_expression: null | string
  is_updatable: "NO" | "YES"
}

export interface MySQLColumn {
  Field: string
  Type: string
  Null: "NO" | "YES"
  Key: "PRI" | "MUL" | ""
  Default: null | any
  Extra: null | string
}

export enum TriggeringEvent {
  INSERT = "INSERT",
  DELETE = "DELETE",
  UPDATE = "UPDATE",
  LOGON = "LOGON",
  LOGOFF = "LOGOFF",
  STARTUP = "STARTUP",
  SHUTDOWN = "SHUTDOWN",
  SERVERERROR = "SERVERERROR",
  SCHEMA = "SCHEMA",
  ALTER = "ALTER",
  DROP = "DROP",
}

export enum TriggerType {
  BEFORE_EACH_ROW = "BEFORE EACH ROW",
  AFTER_EACH_ROW = "AFTER EACH ROW",
  BEFORE_STATEMENT = "BEFORE STATEMENT",
  AFTER_STATEMENT = "AFTER STATEMENT",
  INSTEAD_OF = "INSTEAD OF",
  COMPOUND = "COMPOUND",
}
