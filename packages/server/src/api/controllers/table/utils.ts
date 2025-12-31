import { context, HTTPError } from "@budibase/backend-core"
import {
  AutoFieldSubType,
  Database,
  Datasource,
  FieldSchema,
  FieldType,
  NumberFieldMetadata,
  RelationshipFieldMetadata,
  RenameColumn,
  Row,
  SourceName,
  Table,
} from "@budibase/types"
import { cloneDeep } from "lodash/fp"
import isEqual from "lodash/isEqual"
import {
  CanSwitchTypes,
  GOOGLE_SHEETS_PRIMARY_KEY,
  SwitchableTypes,
  USERS_TABLE_SCHEMA,
} from "../../../constants"
import { generateRowID, getRowParams, InternalTables } from "../../../db/utils"
import {
  AttachmentCleanup,
  inputProcessing,
} from "../../../utilities/rowProcessor"
import { isRows, isSchema, parse } from "../../../utilities/schema"

export async function clearColumns(table: Table, columnNames: string[]) {
  const db = context.getWorkspaceDB()
  const rows = await db.allDocs(
    getRowParams(table._id, null, {
      include_docs: true,
    })
  )
  return (await db.bulkDocs(
    rows.rows.map(({ doc }: any) => {
      columnNames.forEach((colName: any) => delete doc[colName])
      return doc
    })
  )) as { id: string; _rev?: string }[]
}

export async function checkForColumnUpdates(
  updatedTable: Table,
  oldTable?: Table,
  columnRename?: RenameColumn
) {
  const db = context.getWorkspaceDB()
  let updatedRows = []
  let deletedColumns: any = []
  if (oldTable && oldTable.schema && updatedTable.schema) {
    deletedColumns = Object.keys(oldTable.schema).filter(
      colName => updatedTable.schema[colName] == null
    )
  }
  // check for renaming of columns or deleted columns
  if (columnRename || deletedColumns.length !== 0) {
    // Update all rows
    const rows = await db.allDocs(
      getRowParams(updatedTable._id, null, {
        include_docs: true,
      })
    )
    const rawRows = rows.rows.map(({ doc }: any) => doc)
    updatedRows = rawRows.map((row: any) => {
      row = cloneDeep(row)
      if (columnRename) {
        const hasUpdated = row[columnRename.updated] !== undefined
        const hasOld = row[columnRename.old] !== undefined
        if (!hasUpdated && hasOld) {
          row[columnRename.updated] = row[columnRename.old]
        }
        delete row[columnRename.old]
      } else if (deletedColumns.length !== 0) {
        deletedColumns.forEach((colName: any) => delete row[colName])
      }
      return row
    })

    // cleanup any attachments from object storage for deleted attachment columns
    await AttachmentCleanup.tableUpdate(updatedTable, rawRows, {
      oldTable,
      rename: columnRename,
    })
  }

  return { rows: updatedRows, table: updatedTable }
}

// makes sure the passed in table isn't going to reset the auto ID
export function makeSureTableUpToDate(table: Table, tableToSave: Table) {
  if (!table) {
    return tableToSave
  }
  // sure sure rev is up to date
  tableToSave._rev = table._rev
  // make sure auto IDs are always updated - these are internal
  // so the client may not know they have changed
  let field: any
  let column: any
  for ([field, column] of Object.entries(table.schema)) {
    if (
      column.autocolumn &&
      column.subtype === AutoFieldSubType.AUTO_ID &&
      tableToSave.schema[field]
    ) {
      const tableCol = tableToSave.schema[field] as NumberFieldMetadata
      tableCol.lastID = column.lastID
    }
  }
  return tableToSave
}

export async function importToRows(
  data: Row[],
  table: Table,
  userId?: string,
  opts?: { keepCouchId: boolean }
) {
  const originalTable = table
  const finalData: Row[] = []
  const keepCouchId = !!opts?.keepCouchId
  for (let i = 0; i < data.length; i++) {
    let row = data[i]
    row._id = (keepCouchId && row._id) || generateRowID(table._id!)
    row.type = "row"
    row.tableId = table._id

    // We use a reference to table here and update it after input processing,
    // so that we can auto increment auto IDs in imported data properly
    row = await inputProcessing(userId, table, row, {
      noAutoRelationships: true,
    })

    // However here we must reference the original table, as we want to mutate
    // the real schema of the table passed in, not the clone used for
    // incrementing auto IDs
    for (const [fieldName, schema] of Object.entries(originalTable.schema)) {
      if (schema.type === FieldType.LINK && data.find(row => row[fieldName])) {
        throw new HTTPError(
          `Can't bulk import relationship fields for internal databases, found value in field "${fieldName}"`,
          400
        )
      }

      if (
        (schema.type === FieldType.OPTIONS ||
          schema.type === FieldType.ARRAY) &&
        row[fieldName]
      ) {
        const isArray = Array.isArray(row[fieldName])

        // Add option to inclusion constraints
        const rowVal = isArray ? row[fieldName] : [row[fieldName]]
        let merged = [...schema.constraints!.inclusion!, ...rowVal]
        let superSet = new Set(merged)
        schema.constraints!.inclusion = Array.from(superSet)
        schema.constraints!.inclusion.sort()

        // If array type, ensure we import the value as an array
        if (!isArray && schema.type === FieldType.ARRAY) {
          row[fieldName] = rowVal
        }
      }
    }

    finalData.push(row)
  }
  return finalData
}

export async function handleDataImport(
  table: Table,
  opts?: { identifierFields?: string[]; userId?: string; importRows?: Row[] }
) {
  const schema = table.schema
  const identifierFields = opts?.identifierFields || []
  const importRows = opts?.importRows

  if (!importRows || !isRows(importRows) || !isSchema(schema)) {
    return table
  }

  const db = context.getWorkspaceDB()
  const data = parse(importRows, table)

  const finalData = await importToRows(data, table, opts?.userId, {
    keepCouchId: identifierFields.includes("_id"),
  })

  let newRowCount = finalData.length

  //Set IDs of finalData to match existing row if an update is expected
  if (identifierFields.length > 0) {
    const allDocs = await db.allDocs(
      getRowParams(table._id, null, {
        include_docs: true,
      })
    )
    allDocs.rows
      .map(existingRow => existingRow.doc)
      .forEach((doc: any) => {
        finalData.forEach((finalItem: any) => {
          let match = true
          for (const field of identifierFields) {
            if (finalItem[field] !== doc[field]) {
              match = false
              break
            }
          }
          if (match) {
            finalItem._id = doc._id
            finalItem._rev = doc._rev

            newRowCount--
          }
        })
      })
  }

  await db.bulkDocs(finalData)
  return table
}

export async function handleSearchIndexes(table: Table) {
  const db = context.getWorkspaceDB()
  // create relevant search indexes
  if (table.indexes && table.indexes.length > 0) {
    const currentIndexes = await db.getIndexes()
    const indexName = `search:${table._id}`

    const existingIndex = currentIndexes.indexes.find(
      (existing: any) => existing.name === indexName
    )

    if (existingIndex) {
      const currentFields = existingIndex.def.fields.map(
        (field: any) => Object.keys(field)[0]
      )

      // if index fields have changed, delete the original index
      if (!isEqual(currentFields, table.indexes)) {
        await db.deleteIndex(existingIndex)
        // create/recreate the index with fields
        await db.createIndex({
          index: {
            fields: table.indexes,
            name: indexName,
            ddoc: "search_ddoc",
            type: "json",
          },
        })
      }
    } else {
      // create/recreate the index with fields
      await db.createIndex({
        index: {
          fields: table.indexes,
          name: indexName,
          ddoc: "search_ddoc",
          type: "json",
        },
      })
    }
  }
  return table
}

export function checkStaticTables(table: Table) {
  // check user schema has all required elements
  if (table._id === InternalTables.USER_METADATA) {
    for (let [key, schema] of Object.entries(USERS_TABLE_SCHEMA.schema)) {
      // check if the schema exists on the table to be created/updated
      if (table.schema[key] == null) {
        table.schema[key] = schema as FieldSchema
      }
    }
  }
  return table
}

class TableSaveFunctions {
  db: Database
  userId?: string
  oldTable?: Table
  importRows?: Row[]
  rows: Row[]

  constructor({
    userId,
    oldTable,
    importRows,
  }: {
    userId?: string
    oldTable?: Table
    importRows?: Row[]
  }) {
    this.db = context.getWorkspaceDB()
    this.userId = userId
    this.oldTable = oldTable
    this.importRows = importRows
    // any rows that need updated
    this.rows = []
  }

  // before anything is done
  async before(table: Table) {
    if (this.oldTable) {
      table = makeSureTableUpToDate(this.oldTable, table)
    }
    table = checkStaticTables(table)
    return table
  }

  // when confirmed valid
  async mid(table: Table, columnRename?: RenameColumn) {
    let response = await checkForColumnUpdates(
      table,
      this.oldTable,
      columnRename
    )
    this.rows = this.rows.concat(response.rows)
    return table
  }

  getUpdatedRows() {
    return this.rows
  }
}

export function mergePendingColumnRenames(
  existing: RenameColumn[],
  renaming: RenameColumn
) {
  const pending = existing ? [...existing] : []
  pending.push(renaming)
  return pending
}

export function generateForeignKey(
  column: RelationshipFieldMetadata,
  relatedTable: Table
) {
  return `fk_${relatedTable.name}_${column.fieldName}`
}

export function generateJunctionTableName(
  column: RelationshipFieldMetadata,
  table: Table,
  relatedTable: Table
) {
  return `jt_${table.name}_${relatedTable.name}_${column.name}_${column.fieldName}`
}

export function foreignKeyStructure(keyName: string, meta?: any) {
  const structure: any = {
    type: FieldType.NUMBER,
    constraints: {},
    name: keyName,
  }
  if (meta) {
    structure.meta = meta
  }
  return structure
}

export function areSwitchableTypes(type1: FieldType, type2: FieldType) {
  if (
    SwitchableTypes.indexOf(type1) === -1 &&
    SwitchableTypes.indexOf(type2) === -1
  ) {
    return false
  }
  for (let option of CanSwitchTypes) {
    const index1 = option.indexOf(type1),
      index2 = option.indexOf(type2)
    if (index1 !== -1 && index2 !== -1 && index1 !== index2) {
      return true
    }
  }
  return false
}

export function hasTypeChanged(table: Table, oldTable: Table | undefined) {
  if (!oldTable) {
    return false
  }
  for (let [key, field] of Object.entries(oldTable.schema)) {
    if (!table.schema[key]) {
      continue
    }
    const oldType = field.type
    const newType = table.schema[key].type
    if (oldType !== newType && !areSwitchableTypes(oldType, newType)) {
      return true
    }
  }
  return false
}

// used for external tables, some of them will have static schemas that need
// to be hard set
export function setStaticSchemas(datasource: Datasource, table: Table) {
  // GSheets is a specific case - only ever has a static primary key
  if (table && datasource.source === SourceName.GOOGLE_SHEETS) {
    table.primary = [GOOGLE_SHEETS_PRIMARY_KEY]
    // if there is an id column, remove it, should never exist in GSheets
    delete table.schema?.id
  }
  return table
}

const _TableSaveFunctions = TableSaveFunctions
export { _TableSaveFunctions as TableSaveFunctions }
