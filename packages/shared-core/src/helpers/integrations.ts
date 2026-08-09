import { SourceName } from "@supertoolmake/types"

export function isSQL(datasource: { source: SourceName; isSQL?: boolean } | undefined): boolean {
  if (!datasource) {
    return false
  }

  const SQL = [SourceName.POSTGRES, SourceName.SQL_SERVER, SourceName.MYSQL]
  return SQL.indexOf(datasource.source) !== -1 || datasource.isSQL === true
}
