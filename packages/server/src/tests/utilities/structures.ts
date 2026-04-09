import { roles, utils } from "@supertoolmake/backend-core"
import { generator } from "@supertoolmake/backend-core/tests"
import {
  BuiltinPermissionID,
  type Datasource,
  FieldType,
  INTERNAL_TABLE_SOURCE_ID,
  type Query,
  type Role,
  type Screen,
  SourceName,
  type Table,
  TableSourceType,
} from "@supertoolmake/types"
import { merge } from "lodash"
import { cloneDeep } from "lodash/fp"
import { BASE_LAYOUT_PROP_IDS, EMPTY_LAYOUT } from "../../constants/layouts"

export { createQueryScreen, createTableScreen } from "./structures/screens"

const { BUILTIN_ROLE_IDS } = roles

export function tableForDatasource(datasource?: Datasource, ...extra: Partial<Table>[]): Table {
  return merge(
    {
      name: generator.guid().substring(0, 10),
      type: "table",
      sourceType: datasource ? TableSourceType.EXTERNAL : TableSourceType.INTERNAL,
      sourceId: datasource ? datasource._id! : INTERNAL_TABLE_SOURCE_ID,
      schema: {},
    },
    ...extra
  )
}

export function basicTable(datasource?: Datasource, ...extra: Partial<Table>[]): Table {
  return tableForDatasource(
    datasource,
    {
      name: "TestTable",
      schema: {
        name: {
          type: FieldType.STRING,
          name: "name",
          constraints: {
            type: "string",
          },
        },
        description: {
          type: FieldType.STRING,
          name: "description",
          constraints: {
            type: "string",
          },
        },
      },
    },
    ...extra
  )
}

export function basicRow(tableId: string) {
  return {
    name: "Test Contact",
    description: "original description",
    tableId: tableId,
  }
}

export function basicLinkedRow(tableId: string, linkedRowId: string, linkField = "link") {
  // this is based on the basic linked tables you get from the test configuration
  return {
    ...basicRow(tableId),
    [linkField]: [linkedRowId],
  }
}

export function basicRole(): Role {
  return {
    name: `NewRole_${utils.newid()}`,
    inherits: roles.BUILTIN_ROLE_IDS.BASIC,
    permissionId: BuiltinPermissionID.WRITE,
    permissions: {},
    version: "name",
  }
}

export function basicDatasource(): { datasource: Datasource } {
  return {
    datasource: {
      type: "datasource",
      name: "Test",
      source: SourceName.POSTGRES,
      config: {},
    },
  }
}

export function basicDatasourcePlus(): { datasource: Datasource } {
  return {
    datasource: {
      ...basicDatasource().datasource,
      plus: true,
    },
  }
}

export function basicQuery(datasourceId: string): Query {
  return {
    datasourceId,
    name: "New Query",
    parameters: [],
    fields: {},
    schema: {},
    queryVerb: "read",
    transformer: null,
    readable: true,
  }
}

export function basicUser(role: string) {
  return {
    email: "bill@bill.com",
    password: "yeeooo",
    roleId: role,
  }
}

export const TEST_WORKSPACEAPPID_PLACEHOLDER = "workspaceAppId"

function createHomeScreen(
  config: { roleId: string; route: string } = {
    roleId: roles.BUILTIN_ROLE_IDS.BASIC,
    route: "/",
  }
): Screen {
  return {
    layoutId: BASE_LAYOUT_PROP_IDS.PRIVATE,
    props: {
      _id: "d834fea2-1b3e-4320-ab34-f9009f5ecc59",
      _component: "@budibase/standard-components/container",
      _styles: {
        normal: {},
        hover: {},
        active: {},
        selected: {},
      },
      _transition: "fade",
      _children: [
        {
          _id: "ef60083f-4a02-4df3-80f3-a0d3d16847e7",
          _component: "@budibase/standard-components/heading",
          _styles: {
            hover: {},
            active: {},
            selected: {},
          },
          text: "Welcome to your SuperToolMake App 👋",
          size: "M",
          align: "left",
          _instanceName: "Heading",
          _children: [],
        },
      ],
      _instanceName: "Home",
      direction: "column",
      hAlign: "stretch",
      vAlign: "top",
      size: "grow",
      gap: "M",
    },
    routing: {
      route: config.route,
      roleId: config.roleId,
    },
    name: "home-screen",
    workspaceAppId: TEST_WORKSPACEAPPID_PLACEHOLDER,
  }
}

export function basicScreen(route = "/") {
  return createHomeScreen({
    roleId: BUILTIN_ROLE_IDS.BASIC,
    route,
  })
}

export function customScreen(config: { roleId: string; route: string }) {
  return createHomeScreen(config)
}

export function basicLayout() {
  return cloneDeep(EMPTY_LAYOUT)
}
