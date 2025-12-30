import { roles, utils } from "@budibase/backend-core"
import { BASE_LAYOUT_PROP_IDS, EMPTY_LAYOUT } from "../../constants/layouts"
import { cloneDeep } from "lodash/fp"
import {
  AutoFieldSubType,
  BBReferenceFieldSubType,
  CreateViewRequest,
  Datasource,
  FieldSchema,
  FieldType,
  INTERNAL_TABLE_SOURCE_ID,
  JsonFieldSubType,
  Query,
  Role,
  SourceName,
  Table,
  TableSourceType,
  Webhook,
  WebhookActionType,
  BuiltinPermissionID,
  CreateEnvironmentVariableRequest,
  Screen,
} from "@budibase/types"
import { merge } from "lodash"
import { generator } from "@budibase/backend-core/tests"
export {
  createTableScreen,
  createQueryScreen,
  createViewScreen,
} from "./structures/screens"

const { BUILTIN_ROLE_IDS } = roles

export function tableForDatasource(
  datasource?: Datasource,
  ...extra: Partial<Table>[]
): Table {
  return merge(
    {
      name: generator.guid().substring(0, 10),
      type: "table",
      sourceType: datasource
        ? TableSourceType.EXTERNAL
        : TableSourceType.INTERNAL,
      sourceId: datasource ? datasource._id! : INTERNAL_TABLE_SOURCE_ID,
      schema: {},
    },
    ...extra
  )
}

export function basicTable(
  datasource?: Datasource,
  ...extra: Partial<Table>[]
): Table {
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

export function basicTableWithAttachmentField(
  datasource?: Datasource,
  ...extra: Partial<Table>[]
): Table {
  return tableForDatasource(
    datasource,
    {
      name: "TestTable",
      schema: {
        file_attachment: {
          type: FieldType.ATTACHMENTS,
          name: "description",
          constraints: {
            type: "array",
          },
        },
        single_file_attachment: {
          type: FieldType.ATTACHMENT_SINGLE,
          name: "description",
        },
      },
    },
    ...extra
  )
}

export function basicView(tableId: string) {
  return {
    tableId,
    name: "ViewTest",
  }
}

export function filterView(tableId: string) {
  return {
    ...basicView(tableId),
    filters: [
      {
        value: 0,
        condition: "MT",
        key: "count",
      },
    ],
  }
}

export function calculationView(tableId: string) {
  return {
    ...basicView(tableId),
    field: "count",
    calculation: "sum",
  }
}

export function view(tableId: string) {
  return {
    ...filterView(tableId),
    ...calculationView(tableId),
  }
}

function viewV2CreateRequest(tableId: string): CreateViewRequest {
  return {
    tableId,
    name: generator.guid(),
  }
}

export const viewV2 = {
  createRequest: viewV2CreateRequest,
}

export function basicRow(tableId: string) {
  return {
    name: "Test Contact",
    description: "original description",
    tableId: tableId,
  }
}

export function basicLinkedRow(
  tableId: string,
  linkedRowId: string,
  linkField = "link"
) {
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
  config: {
    roleId: string
    route: string
  } = {
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
          text: "Welcome to your Budibase App 👋",
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

export function powerScreen(route = "/") {
  return createHomeScreen({
    roleId: BUILTIN_ROLE_IDS.POWER,
    route,
  })
}

export function customScreen(config: { roleId: string; route: string }) {
  return createHomeScreen(config)
}

export function basicLayout() {
  return cloneDeep(EMPTY_LAYOUT)
}

export function basicWebhook(automationId: string): Webhook {
  return {
    live: true,
    name: "webhook",
    action: {
      type: WebhookActionType.AUTOMATION,
      target: automationId,
    },
  }
}

export function basicEnvironmentVariable(
  name: string,
  prod: string,
  dev?: string
): CreateEnvironmentVariableRequest {
  return {
    name,
    production: prod,
    development: dev || prod,
  }
}

export function fullSchemaWithoutLinks({
  allRequired,
}: {
  allRequired?: boolean
}): {
  [type in Exclude<FieldType, FieldType.LINK>]: FieldSchema & { type: type }
} {
  return {
    [FieldType.STRING]: {
      name: "string",
      type: FieldType.STRING,
      constraints: {
        presence: allRequired,
      },
    },
    [FieldType.LONGFORM]: {
      name: "longform",
      type: FieldType.LONGFORM,
      constraints: {
        presence: allRequired,
      },
    },
    [FieldType.OPTIONS]: {
      name: "options",
      type: FieldType.OPTIONS,
      constraints: {
        presence: allRequired,
        inclusion: ["option 1", "option 2", "option 3", "option 4"],
      },
    },
    [FieldType.ARRAY]: {
      name: "array",
      type: FieldType.ARRAY,
      constraints: {
        presence: allRequired,
        type: JsonFieldSubType.ARRAY,
        inclusion: ["options 1", "options 2", "options 3", "options 4"],
      },
    },
    [FieldType.NUMBER]: {
      name: "number",
      type: FieldType.NUMBER,
      constraints: {
        presence: allRequired,
      },
    },
    [FieldType.BOOLEAN]: {
      name: "boolean",
      type: FieldType.BOOLEAN,
      constraints: {
        presence: allRequired,
      },
    },
    [FieldType.DATETIME]: {
      name: "datetime",
      type: FieldType.DATETIME,
      dateOnly: true,
      timeOnly: false,
      constraints: {
        presence: allRequired,
      },
    },
    [FieldType.FORMULA]: {
      name: "formula",
      type: FieldType.FORMULA,
      formula: "any formula",
      constraints: {
        presence: allRequired,
      },
    },
    [FieldType.BARCODEQR]: {
      name: "barcodeqr",
      type: FieldType.BARCODEQR,
      constraints: {
        presence: allRequired,
      },
    },
    [FieldType.BIGINT]: {
      name: "bigint",
      type: FieldType.BIGINT,
      constraints: {
        presence: allRequired,
      },
    },
    [FieldType.BB_REFERENCE]: {
      name: "user",
      type: FieldType.BB_REFERENCE,
      subtype: BBReferenceFieldSubType.USER,
      constraints: {
        presence: allRequired,
      },
    },
    [FieldType.BB_REFERENCE_SINGLE]: {
      name: "users",
      type: FieldType.BB_REFERENCE_SINGLE,
      subtype: BBReferenceFieldSubType.USER,
      constraints: {
        presence: allRequired,
      },
    },
    [FieldType.ATTACHMENTS]: {
      name: "attachments",
      type: FieldType.ATTACHMENTS,
      constraints: {
        presence: allRequired,
      },
    },
    [FieldType.ATTACHMENT_SINGLE]: {
      name: "attachment_single",
      type: FieldType.ATTACHMENT_SINGLE,
      constraints: {
        presence: allRequired,
      },
    },
    [FieldType.AUTO]: {
      name: "auto",
      type: FieldType.AUTO,
      subtype: AutoFieldSubType.AUTO_ID,
      autocolumn: true,
      constraints: {
        presence: allRequired,
      },
    },
    [FieldType.JSON]: {
      name: "json",
      type: FieldType.JSON,
      constraints: {
        presence: allRequired,
      },
    },
    [FieldType.INTERNAL]: {
      name: "internal",
      type: FieldType.INTERNAL,
      constraints: {
        presence: allRequired,
      },
    },
    [FieldType.SIGNATURE_SINGLE]: {
      name: "signature_single",
      type: FieldType.SIGNATURE_SINGLE,
      constraints: {
        presence: allRequired,
      },
    },
  }
}
export function basicAttachment() {
  return {
    key: generator.guid(),
    name: generator.word(),
    extension: generator.word(),
    size: generator.natural(),
    url: `/${generator.guid()}`,
  }
}
