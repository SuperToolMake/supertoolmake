import type { JSONArrayFieldDatasource } from "@budibase/types"
import { getJSONArrayDatasourceSchema } from "../utils/json"
import FieldFetch from "./FieldFetch"

export default class JSONArrayFetch extends FieldFetch<JSONArrayFieldDatasource> {
  async getDefinition() {
    const { datasource } = this.options

    // JSON arrays need their table definitions fetched.
    // We can then extract their schema as a subset of the table schema.
    try {
      const { fieldName } = datasource
      const table = await this.API.fetchTableDefinition(datasource.tableId)
      const schema =
        table.schema[fieldName].schema ?? getJSONArrayDatasourceSchema(table.schema, datasource)
      return { schema }
    } catch {
      return null
    }
  }
}
