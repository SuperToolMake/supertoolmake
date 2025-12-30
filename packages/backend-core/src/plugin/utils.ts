import {
  DatasourceFieldType,
  QueryType,
  PluginType,
  DatasourceFeature,
} from "@budibase/types"
import joi from "joi"

const DATASOURCE_TYPES = [
  "Relational",
  "Non-relational",
  "Spreadsheet",
  "Object store",
  "Graph",
  "API",
]

function runJoi(validator: joi.Schema, schema: any) {
  const { error } = validator.validate(schema)
  if (error) {
    throw error
  }
}

function validateComponent(schema: any) {
  const validator = joi.object({
    type: joi.string().allow(PluginType.COMPONENT).required(),
    metadata: joi.object().unknown(true).required(),
    hash: joi.string().optional(),
    version: joi.string().optional(),
    schema: joi
      .object({
        name: joi.string().required(),
        settings: joi.array().items(joi.object().unknown(true)).required(),
      })
      .unknown(true),
  })
  runJoi(validator, schema)
}

function validateDatasource(schema: any) {
  const fieldValidator = joi.object({
    type: joi
      .string()
      .allow(...Object.values(DatasourceFieldType))
      .required(),
    required: joi.boolean().required(),
    default: joi.any(),
    display: joi.string(),
  })

  const queryValidator = joi
    .object({
      type: joi.string().allow(...Object.values(QueryType)),
      readable: joi.boolean(),
      displayName: joi.string(),
      fields: joi.object().pattern(joi.string(), fieldValidator),
    })
    .required()

  const validator = joi.object({
    type: joi.string().allow(PluginType.DATASOURCE).required(),
    metadata: joi.object().unknown(true).required(),
    hash: joi.string().optional(),
    version: joi.string().optional(),
    schema: joi.object({
      docs: joi.string(),
      plus: joi.boolean().optional(),
      isSQL: joi.boolean().optional(),
      auth: joi
        .object({
          type: joi.string().required(),
        })
        .optional(),
      features: joi
        .object(
          Object.fromEntries(
            Object.values(DatasourceFeature).map(key => [
              key,
              joi.boolean().optional(),
            ])
          )
        )
        .optional(),
      relationships: joi.boolean().optional(),
      description: joi.string().required(),
      friendlyName: joi.string().required(),
      type: joi.string().allow(...DATASOURCE_TYPES),
      datasource: joi.object().pattern(joi.string(), fieldValidator).required(),
      query: joi
        .object()
        .pattern(joi.string(), queryValidator)
        .unknown(true)
        .required(),
      extra: joi.object().pattern(
        joi.string(),
        joi.object({
          type: joi.string().required(),
          displayName: joi.string().required(),
          required: joi.boolean(),
          data: joi.object(),
        })
      ),
    }),
  })
  runJoi(validator, schema)
}

export function validate(schema: any) {
  switch (schema?.type) {
    case PluginType.COMPONENT:
      validateComponent(schema)
      break
    case PluginType.DATASOURCE:
      validateDatasource(schema)
      break
    default:
      throw new Error(`Unknown plugin type - check schema.json: ${schema.type}`)
  }
}
