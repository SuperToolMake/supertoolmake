import { helpers } from "@supertoolmake/shared-core"
import type { Table, WithoutDocMetadata } from "@supertoolmake/types"
import { create } from "./create"
import { getAllInternalTables } from "./getters"

/**
 * Duplicates an internal table without its data
 * @param table - The table to duplicate
 * @returns The new duplicated table
 */
export async function duplicate(table: Table): Promise<Table> {
  const existingTables = await getAllInternalTables()
  const duplicatedName = helpers.duplicateName(
    table.name,
    existingTables.map((t) => t.name)
  )

  const tableToCreate: WithoutDocMetadata<Table> = {
    name: duplicatedName,
    type: table.type,
    sourceType: table.sourceType,
    sourceId: table.sourceId,
    schema: { ...table.schema },
    indexes: table.indexes ? { ...table.indexes } : undefined,
    // Don't include any data/rows - this is intentionally empty
  }

  const duplicatedTable = await create(tableToCreate)

  return duplicatedTable
}
