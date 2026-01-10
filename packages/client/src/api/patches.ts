import { Constants, APIClient } from "@budibase/frontend-core"
import { FieldTypes } from "../constants"
import { Row, Table } from "@budibase/types"

export const patchAPI = (API: APIClient) => {
  /**
   * Enriches rows which contain certain field types so that they can
   * be properly displayed.
   * The ability to create these bindings has been removed, but they will still
   * exist in client apps to support backwards compatibility.
   */
  const enrichRows = async (rows: Row[], tableId: string) => {
    if (!Array.isArray(rows)) {
      return []
    }
    if (rows.length) {
      const tables: Record<string, Table> = {}
      for (let row of rows) {
        // Fall back to passed in tableId if row doesn't have it specified
        let rowTableId = row.tableId || tableId
        let table = tables[rowTableId]
        if (!table) {
          // Fetch table schema so we can check column types
          table = await API.fetchTableDefinition(rowTableId)
          tables[rowTableId] = table
        }
        const schema = table?.schema
        if (schema) {
          const keys = Object.keys(schema)
          for (let key of keys) {
            const type = schema[key].type
            if (type === FieldTypes.LINK && Array.isArray(row[key])) {
              // Enrich row a string join of relationship fields
              row[`${key}_text`] =
                row[key]
                  ?.map(option => option?.primaryDisplay)
                  .filter(option => !!option)
                  .join(", ") || ""
            }
          }
        }
      }
    }
    return rows
  }

  // Enrich rows so they properly handle client bindings
  const fetchSelf = API.fetchSelf
  API.fetchSelf = async () => {
    const user = await fetchSelf()
    if (user && "_id" in user && user._id) {
      if (user.roleId === "PUBLIC") {
        // Don't try to enrich a public user as it will 403
        return user
      }
      try {
        return (await enrichRows([user], Constants.TableNames.USERS))[0]
      } catch (error: any) {
        const status = error?.status ?? error?.response?.status
        // If we don't have permission to fetch the Users table schema,
        // return the raw user so we never downgrade the role to PUBLIC
        if (status === 401 || status === 403) {
          return user
        }
        throw error
      }
    }
    return null
  }
  const fetchRelationshipData = API.fetchRelationshipData
  API.fetchRelationshipData = async (
    sourceId: string,
    rowId: string,
    fieldName?: string
  ) => {
    const rows = await fetchRelationshipData(sourceId, rowId, fieldName)
    return await enrichRows(rows, sourceId)
  }
  const fetchTableData = API.fetchTableData
  API.fetchTableData = async (tableId: string) => {
    const rows = await fetchTableData(tableId)
    return await enrichRows(rows, tableId)
  }
  const searchTable = API.searchTable
  API.searchTable = async (sourceId: string, opts: object) => {
    const output = await searchTable(sourceId, opts)
    return {
      ...output,
      rows: await enrichRows(output.rows, sourceId),
    }
  }

  // Wipe any HBS formulas from table definitions, as these interfere with
  // handlebars enrichment
  const fetchTableDefinition = API.fetchTableDefinition
  API.fetchTableDefinition = async (tableId: string) => {
    const definition = await fetchTableDefinition(tableId)
    return definition
  }
}
