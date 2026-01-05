import { auth, permissions } from "@budibase/backend-core"
import {
  EmptyFilterOption,
  SearchFilters,
  BuiltinPermissionID,
} from "@budibase/types"
import Joi from "joi"
import { ValidSnippetNameRegex } from "@budibase/shared-core"

const OPTIONAL_STRING = Joi.string().optional().allow(null).allow("")
const OPTIONAL_NUMBER = Joi.number().optional().allow(null)
const OPTIONAL_BOOLEAN = Joi.boolean().optional().allow(null)
const APP_NAME_REGEX = /^[\w\s]+$/

export function tableValidator() {
  return auth.joiValidator.body(
    Joi.object({
      _id: OPTIONAL_STRING,
      _rev: OPTIONAL_STRING,
      type: OPTIONAL_STRING.valid("table", "internal", "external"),
      primaryDisplay: OPTIONAL_STRING,
      schema: Joi.object().required(),
      name: Joi.string().required(),
      views: Joi.object(),
      rows: Joi.array(),
    }).unknown(true),
    { errorPrefix: "" }
  )
}

export function nameValidator() {
  return auth.joiValidator.body(
    Joi.object({
      name: OPTIONAL_STRING,
    })
  )
}

export function datasourceValidator() {
  return auth.joiValidator.body(
    Joi.object({
      _id: Joi.string(),
      _rev: Joi.string(),
      type: OPTIONAL_STRING.allow("datasource_plus"),
      relationships: Joi.array().items(
        Joi.object({
          from: Joi.string().required(),
          to: Joi.string().required(),
          cardinality: Joi.valid("1:N", "1:1", "N:N").required(),
        })
      ),
    }).unknown(true)
  )
}

function searchFiltersValidator() {
  const conditionalFilteringObject = () =>
    Joi.object({
      conditions: Joi.array().items(Joi.link("#schema")).required(),
    })

  const filtersValidators: Record<keyof SearchFilters, any> = {
    string: Joi.object().optional(),
    fuzzy: Joi.object().optional(),
    range: Joi.object().optional(),
    equal: Joi.object().optional(),
    notEqual: Joi.object().optional(),
    empty: Joi.object().optional(),
    notEmpty: Joi.object().optional(),
    oneOf: Joi.object().optional(),
    contains: Joi.object().optional(),
    notContains: Joi.object().optional(),
    containsAny: Joi.object().optional(),
    allOr: Joi.boolean().optional(),
    onEmptyFilter: Joi.string()
      .optional()
      .valid(...Object.values(EmptyFilterOption)),
    $and: conditionalFilteringObject(),
    $or: conditionalFilteringObject(),
    fuzzyOr: Joi.forbidden(),
    documentType: Joi.forbidden(),
  }

  return Joi.object(filtersValidators)
}

function filterObject(opts?: { unknown: boolean }) {
  const { unknown = true } = opts || {}

  return searchFiltersValidator().unknown(unknown).id("schema")
}

export function internalSearchValidator() {
  return auth.joiValidator.body(
    Joi.object({
      tableId: OPTIONAL_STRING,
      query: filterObject(),
      limit: OPTIONAL_NUMBER,
      sort: OPTIONAL_STRING,
      sortOrder: OPTIONAL_STRING,
      sortType: OPTIONAL_STRING,
      paginate: Joi.boolean(),
      countRows: Joi.boolean(),
      bookmark: Joi.alternatives()
        .try(OPTIONAL_STRING, OPTIONAL_NUMBER)
        .optional(),
    })
  )
}

export function externalSearchValidator() {
  return auth.joiValidator.body(
    Joi.object({
      query: filterObject(),
      paginate: Joi.boolean().optional(),
      bookmark: Joi.alternatives()
        .try(OPTIONAL_STRING, OPTIONAL_NUMBER)
        .optional(),
      limit: OPTIONAL_NUMBER,
      sort: Joi.object({
        column: Joi.string(),
        order: OPTIONAL_STRING.valid("ascending", "descending"),
        type: OPTIONAL_STRING.valid("string", "number"),
      }).optional(),
    })
  )
}

export function roleValidator() {
  const permLevelArray = Object.values(permissions.PermissionLevel)
  const permissionString = Joi.string().valid(...permLevelArray)
  return auth.joiValidator.body(
    Joi.object({
      _id: OPTIONAL_STRING,
      _rev: OPTIONAL_STRING,
      name: Joi.string()
        .regex(/^[a-zA-Z0-9_]*$/)
        .required(),
      uiMetadata: Joi.object({
        displayName: OPTIONAL_STRING,
        color: OPTIONAL_STRING,
        description: OPTIONAL_STRING,
      }).optional(),
      // this is the base permission ID (for now a built in)
      permissionId: Joi.string()
        .valid(...Object.values(BuiltinPermissionID))
        .optional(),
      permissions: Joi.object()
        .pattern(
          /.*/,
          Joi.alternatives().try(
            Joi.array().items(permissionString),
            permissionString
          )
        )
        .optional(),
      inherits: Joi.alternatives().try(
        OPTIONAL_STRING,
        Joi.array().items(OPTIONAL_STRING)
      ),
    }).unknown(true)
  )
}

export function permissionValidator() {
  const permLevelArray = Object.values(permissions.PermissionLevel)

  return auth.joiValidator.params(
    Joi.object({
      level: Joi.string()
        .valid(...permLevelArray)
        .required(),
      resourceId: Joi.string(),
      roleId: Joi.string(),
    }).unknown(true)
  )
}

export function screenValidator() {
  return auth.joiValidator.body(
    Joi.object({
      name: Joi.string().required(),
      showNavigation: OPTIONAL_BOOLEAN,
      width: OPTIONAL_STRING,
      routing: Joi.object({
        route: Joi.string().required(),
        roleId: Joi.string().required().allow(""),
        homeScreen: OPTIONAL_BOOLEAN,
      })
        .required()
        .unknown(true),
      props: Joi.object({
        _id: Joi.string().required(),
        _component: Joi.string().required(),
        _children: Joi.array().required(),
        _styles: Joi.object().required(),
        type: OPTIONAL_STRING,
        table: OPTIONAL_STRING,
        layoutId: OPTIONAL_STRING,
      })
        .required()
        .unknown(true),
      workspaceAppId: Joi.string().required(),
    }).unknown(true)
  )
}

export function applicationValidator(opts = { isCreate: true }) {
  const base: any = {
    _id: OPTIONAL_STRING,
    _rev: OPTIONAL_STRING,
    url: OPTIONAL_STRING,
    template: Joi.object({}),
  }

  const appNameValidator = Joi.string()
    .pattern(new RegExp(APP_NAME_REGEX))
    .error(new Error("App name must be letters, numbers and spaces only"))
  if (opts.isCreate) {
    base.name = appNameValidator.required()
  } else {
    base.name = appNameValidator.optional()
  }

  const snippetValidator = Joi.array()
    .optional()
    .items(
      Joi.object({
        name: Joi.string()
          .pattern(new RegExp(ValidSnippetNameRegex))
          .error(
            new Error(
              "Snippet name cannot include spaces or special characters, and cannot start with a number"
            )
          ),
        code: OPTIONAL_STRING,
      })
    )

  return auth.joiValidator.body(
    Joi.object({
      _id: OPTIONAL_STRING,
      _rev: OPTIONAL_STRING,
      name: appNameValidator,
      url: OPTIONAL_STRING,
      template: Joi.object({}).unknown(true),
      snippets: snippetValidator,
    }).unknown(true)
  )
}
