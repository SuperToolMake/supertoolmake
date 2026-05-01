import { SourceName } from "@supertoolmake/types"

export function isSQL(datasource: { source: SourceName; isSQL?: boolean }): boolean {
  const SQL = [SourceName.POSTGRES, SourceName.SQL_SERVER, SourceName.MYSQL]
  return SQL.indexOf(datasource.source) !== -1 || datasource.isSQL === true
}
