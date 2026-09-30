import { auth, permissions } from "@supertoolmake/backend-core"
import { ValidSnippetNameRegex } from "@supertoolmake/shared-core"
import { BuiltinPermissionID, EmptyFilterOption, type SearchFilters } from "@supertoolmake/types"
import { z } from "zod"

const OPTIONAL_STRING = z.string().nullish().or(z.literal(""))
const OPTIONAL_NUMBER = z.number().nullish()
const OPTIONAL_BOOLEAN = z.boolean().nullish()
const APP_NAME_REGEX = /^[\w\s]+$/

export function tableValidator() {
  return auth.zodValidator.body(
    z.looseObject({
      _id: OPTIONAL_STRING,
      _rev: OPTIONAL_STRING,
      type: z.enum(["table", "internal", "external"]).nullish().or(z.literal("")),
      primaryDisplay: OPTIONAL_STRING,
      schema: z.looseObject({}),
      name: z.string(),
      views: z.looseObject({}).optional(),
      rows: z.array(z.unknown()).optional(),
    }),
    { errorPrefix: "" }
  )
}

export function nameValidator() {
  return auth.zodValidator.body(
    z.strictObject({
      name: OPTIONAL_STRING,
    })
  )
}

export function publicApiUserValidator() {
  return auth.zodValidator.body(
    z.looseObject({
      builder: z
        .looseObject({
          global: z.boolean().optional(),
          apps: z.array(z.string()).optional(),
          creator: z.boolean().optional(),
        })
        .optional(),
    })
  )
}

export function datasourceValidator() {
  return auth.zodValidator.body(
    z.looseObject({
      _id: z.string().optional(),
      _rev: z.string().optional(),
      type: z.union([OPTIONAL_STRING, z.literal("datasource_plus")]),
      relationships: z
        .array(
          z.strictObject({
            from: z.string(),
            to: z.string(),
            cardinality: z.enum(["1:N", "1:1", "N:N"]),
          })
        )
        .optional(),
    })
  )
}

function searchFiltersValidator(opts?: { unknown: boolean }) {
  const genericFilter = z.looseObject({}).optional()
  const conditionalFilteringObject = z.strictObject({
    conditions: z.array(z.lazy(() => searchFiltersValidator())),
  })

  const filtersValidators: Record<keyof SearchFilters, z.ZodType> = {
    string: genericFilter,
    fuzzy: genericFilter,
    range: genericFilter,
    equal: genericFilter,
    notEqual: genericFilter,
    empty: genericFilter,
    notEmpty: genericFilter,
    oneOf: genericFilter,
    notOneOf: genericFilter,
    contains: genericFilter,
    notContains: genericFilter,
    containsAny: genericFilter,
    allOr: z.boolean().optional(),
    onEmptyFilter: z.enum(EmptyFilterOption).optional(),
    $and: conditionalFilteringObject.optional(),
    $or: conditionalFilteringObject.optional(),
    fuzzyOr: z.never().optional(),
    documentType: z.never().optional(),
  }

  return opts?.unknown === false
    ? z.strictObject(filtersValidators)
    : z.looseObject(filtersValidators)
}

function filterObject(opts?: { unknown: boolean }) {
  return searchFiltersValidator({ unknown: opts?.unknown ?? true })
}

export function internalSearchValidator() {
  return auth.zodValidator.body(
    z.strictObject({
      tableId: OPTIONAL_STRING,
      query: filterObject(),
      limit: OPTIONAL_NUMBER,
      sort: OPTIONAL_STRING,
      sortOrder: OPTIONAL_STRING,
      sortType: OPTIONAL_STRING,
      paginate: z.boolean().optional(),
      countRows: z.boolean().optional(),
      bookmark: z.union([OPTIONAL_STRING, OPTIONAL_NUMBER]).optional(),
    })
  )
}

export function externalSearchValidator() {
  return auth.zodValidator.body(
    z.strictObject({
      query: filterObject(),
      paginate: z.boolean().optional(),
      bookmark: z.union([OPTIONAL_STRING, OPTIONAL_NUMBER]).optional(),
      limit: OPTIONAL_NUMBER,
      sort: z
        .strictObject({
          column: z.string().optional(),
          order: z.union([OPTIONAL_STRING, z.enum(["ascending", "descending"])]),
          type: z.union([OPTIONAL_STRING, z.enum(["string", "number"])]),
        })
        .optional(),
    })
  )
}

export function roleValidator() {
  const permissionString = z.enum(permissions.PermissionLevel)
  return auth.zodValidator.body(
    z.looseObject({
      _id: OPTIONAL_STRING,
      _rev: OPTIONAL_STRING,
      name: z.string().regex(/^[a-zA-Z0-9_]*$/),
      uiMetadata: z
        .looseObject({
          displayName: OPTIONAL_STRING,
          color: OPTIONAL_STRING,
          description: OPTIONAL_STRING,
        })
        .optional(),
      // this is the base permission ID (for now a built in)
      permissionId: z.enum(BuiltinPermissionID).optional(),
      permissions: z
        .record(z.string(), z.union([z.array(permissionString), permissionString]))
        .optional(),
      inherits: z.union([OPTIONAL_STRING, z.array(OPTIONAL_STRING)]).optional(),
    })
  )
}

export function permissionValidator() {
  return auth.zodValidator.params(
    z.looseObject({
      level: z.enum(permissions.PermissionLevel),
      resourceId: z.string().optional(),
      roleId: z.string().optional(),
    })
  )
}

export function screenValidator() {
  return auth.zodValidator.body(
    z.looseObject({
      name: z.string(),
      showNavigation: OPTIONAL_BOOLEAN,
      width: OPTIONAL_STRING,
      routing: z.looseObject({
        route: z.string(),
        roleId: z.string().or(z.literal("")),
        homeScreen: OPTIONAL_BOOLEAN,
      }),
      props: z.looseObject({
        _id: z.string(),
        _component: z.string(),
        _children: z.array(z.unknown()),
        _styles: z.looseObject({}),
        type: OPTIONAL_STRING,
        table: OPTIONAL_STRING,
        layoutId: OPTIONAL_STRING,
      }),
      workspaceAppId: z.string(),
    })
  )
}

export function applicationValidator(opts = { isCreate: true }) {
  const appNameValidator = z
    .string()
    .regex(APP_NAME_REGEX, "App name must be letters, numbers and spaces only")
  const schema = z.looseObject({
    _id: OPTIONAL_STRING,
    _rev: OPTIONAL_STRING,
    name: opts.isCreate ? appNameValidator : appNameValidator.optional(),
    url: OPTIONAL_STRING,
    template: z.looseObject({}).optional(),
    snippets: z
      .array(
        z.strictObject({
          name: z
            .string()
            .regex(
              new RegExp(ValidSnippetNameRegex),
              "Snippet name cannot include spaces or special characters, and cannot start with a number"
            )
            .optional(),
          code: OPTIONAL_STRING,
        })
      )
      .optional(),
  })
  return auth.zodValidator.body(schema)
}
