import type { Data, Item } from './service.js'

type JsonSchema = {
  type?: string
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  nullable?: boolean
  description?: string
}

type OpenAPIParameter = {
  name: string
  in: 'path' | 'query'
  description?: string
  schema: JsonSchema
  required?: boolean
}

type OpenAPIOperation = {
  summary?: string
  description?: string
  parameters?: OpenAPIParameter[]
  requestBody?: {
    required?: boolean
    content: { 'application/json': { schema: JsonSchema } }
  }
  responses: Record<
    string,
    { description: string; content?: { 'application/json': { schema: JsonSchema } } }
  >
}

type OpenAPIPathItem = Partial<Record<string, OpenAPIOperation>>

export type OpenAPISpec = {
  openapi: '3.0.3'
  info: {
    title: string
    version: string
    description: string
  }
  paths: Record<string, OpenAPIPathItem>
  components: {
    schemas: Record<string, JsonSchema>
  }
}

const COLLECTION_QUERY_PARAMS: OpenAPIParameter[] = [
  {
    name: '_embed',
    in: 'query',
    description: 'Embed related resources (comma-separated)',
    schema: { type: 'string' },
  },
  {
    name: '_sort',
    in: 'query',
    description: 'Sort fields (prefix with - for descending)',
    schema: { type: 'string' },
  },
  {
    name: '_start',
    in: 'query',
    description: 'Range start index',
    schema: { type: 'integer' },
  },
  {
    name: '_end',
    in: 'query',
    description: 'Range end index',
    schema: { type: 'integer' },
  },
  {
    name: '_limit',
    in: 'query',
    description: 'Maximum number of items',
    schema: { type: 'integer' },
  },
  {
    name: '_page',
    in: 'query',
    description: 'Page number (use with _per_page)',
    schema: { type: 'integer' },
  },
  {
    name: '_per_page',
    in: 'query',
    description: 'Items per page (default: 10)',
    schema: { type: 'integer' },
  },
]

function inferSchema(value: unknown): JsonSchema {
  if (value === null) {
    return { nullable: true }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { type: 'array', items: {} }
    }
    return { type: 'array', items: inferSchema(value[0]) }
  }

  switch (typeof value) {
    case 'string':
      return { type: 'string' }
    case 'number':
      return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' }
    case 'boolean':
      return { type: 'boolean' }
    case 'object': {
      const properties: Record<string, JsonSchema> = {}
      for (const [key, nested] of Object.entries(value as Item)) {
        properties[key] = inferSchema(nested)
      }
      return { type: 'object', properties }
    }
    default:
      return {}
  }
}

function mergeSchemas(a: JsonSchema, b: JsonSchema): JsonSchema {
  if (a.type === 'object' && b.type === 'object') {
    const properties = { ...a.properties }
    for (const [key, schema] of Object.entries(b.properties ?? {})) {
      properties[key] = properties[key]
        ? mergeSchemas(properties[key], schema)
        : schema
    }
    return { type: 'object', properties }
  }
  return a
}

function inferItemSchema(items: Item[]): JsonSchema {
  const base: JsonSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Resource identifier' },
    },
  }

  const sample = items.slice(0, 5)
  for (const item of sample) {
    const itemSchema = inferSchema(item)
    if (itemSchema.type === 'object' && itemSchema.properties) {
      base.properties = mergeSchemas(
        { type: 'object', properties: base.properties },
        itemSchema,
      ).properties
    }
  }

  return base
}

function filterQueryParams(schema: JsonSchema): OpenAPIParameter[] {
  const params: OpenAPIParameter[] = []
  for (const [name, fieldSchema] of Object.entries(schema.properties ?? {})) {
    if (name === 'id') continue

    params.push({
      name,
      in: 'query',
      description: 'Filter by exact match',
      schema: fieldSchema,
    })

    if (fieldSchema.type === 'integer' || fieldSchema.type === 'number') {
      for (const suffix of ['_lt', '_lte', '_gt', '_gte', '_ne']) {
        params.push({
          name: `${name}${suffix}`,
          in: 'query',
          description: `Filter: ${suffix.slice(1)}`,
          schema: fieldSchema,
        })
      }
    }
  }
  return params
}

function jsonResponse(
  schema: JsonSchema,
  description = 'Successful response',
): OpenAPIOperation['responses'] {
  return {
    '200': {
      description,
      content: { 'application/json': { schema } },
    },
    '404': { description: 'Resource not found' },
  }
}

function collectionPaths(
  name: string,
  itemSchema: JsonSchema,
): Record<string, OpenAPIPathItem> {
  const ref = { $ref: `#/components/schemas/${name}` } as unknown as JsonSchema
  const listSchema: JsonSchema = { type: 'array', items: ref }
  const paginatedSchema: JsonSchema = {
    type: 'object',
    properties: {
      first: { type: 'integer' },
      prev: { type: 'integer', nullable: true },
      next: { type: 'integer', nullable: true },
      last: { type: 'integer' },
      pages: { type: 'integer' },
      items: { type: 'integer' },
      data: listSchema,
    },
  }

  const filterParams = filterQueryParams(itemSchema)

  return {
    [`/${name}`]: {
      get: {
        summary: `List ${name}`,
        parameters: [...COLLECTION_QUERY_PARAMS, ...filterParams],
        responses: {
          '200': {
            description: 'Array of resources or paginated result',
            content: {
              'application/json': {
                schema: {
                  oneOf: [listSchema, paginatedSchema],
                } as unknown as JsonSchema,
              },
            },
          },
          '404': { description: 'Resource not found' },
        },
      },
      post: {
        summary: `Create ${name.slice(0, -1) || name}`,
        description: 'id is generated automatically if omitted',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: Object.fromEntries(
                  Object.entries(itemSchema.properties ?? {}).filter(
                    ([key]) => key !== 'id',
                  ),
                ),
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created resource',
            content: { 'application/json': { schema: ref } },
          },
          '404': { description: 'Resource not found' },
        },
      },
    },
    [`/${name}/{id}`]: {
      get: {
        summary: `Get ${name.slice(0, -1) || name} by id`,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ...COLLECTION_QUERY_PARAMS.filter((p) => p.name === '_embed'),
        ],
        responses: jsonResponse(ref),
      },
      put: {
        summary: `Replace ${name.slice(0, -1) || name}`,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: ref } },
        },
        responses: jsonResponse(ref),
      },
      patch: {
        summary: `Update ${name.slice(0, -1) || name}`,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: ref } },
        },
        responses: jsonResponse(ref),
      },
      delete: {
        summary: `Delete ${name.slice(0, -1) || name}`,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          {
            name: '_dependent',
            in: 'query',
            description: 'Related resources to delete when foreign key is nullified',
            schema: { type: 'string' },
          },
        ],
        responses: jsonResponse(ref),
      },
    },
  }
}

function singletonPaths(name: string): Record<string, OpenAPIPathItem> {
  const ref = { $ref: `#/components/schemas/${name}` } as unknown as JsonSchema

  return {
    [`/${name}`]: {
      get: {
        summary: `Get ${name}`,
        responses: jsonResponse(ref),
      },
      put: {
        summary: `Replace ${name}`,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: ref } },
        },
        responses: jsonResponse(ref),
      },
      patch: {
        summary: `Update ${name}`,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: ref } },
        },
        responses: jsonResponse(ref),
      },
    },
  }
}

export function generateOpenAPISpec(
  data: Data,
  options: { title?: string; version?: string } = {},
): OpenAPISpec {
  const schemas: Record<string, JsonSchema> = {}
  const paths: Record<string, OpenAPIPathItem> = {}

  for (const [name, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      schemas[name] = inferItemSchema(value)
      Object.assign(paths, collectionPaths(name, schemas[name]))
    } else if (value && typeof value === 'object') {
      schemas[name] = inferSchema(value)
      Object.assign(paths, singletonPaths(name))
    }
  }

  return {
    openapi: '3.0.3',
    info: {
      title: options.title ?? 'JSON Server API',
      version: options.version ?? '1.0.0',
      description:
        'OpenAPI specification generated dynamically from your JSON database.',
    },
    paths,
    components: { schemas },
  }
}
