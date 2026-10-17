import assert from 'node:assert/strict'
import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js'
import { fullFormats } from 'ajv-formats/dist/formats.js'
import { openApiDocument } from '../../codigo/openapi.js'

const documentId = 'urn:rephouse:openapi'
const ajv = new Ajv2020({ strict: false, allErrors: true, formats: fullFormats })
ajv.addSchema(openApiDocument, documentId)
const validators = new Map<string, ValidateFunction>()
function references(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(references)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
    key === '$ref' && typeof item === 'string' && item.startsWith('#/') ? `${documentId}${item}` : references(item),
  ]))
  return value
}
export function validarDados(schema: Record<string, unknown>, data: unknown, label: string) {
  const key = JSON.stringify(schema)
  if (!validators.has(key)) validators.set(key, ajv.compile(references(schema) as Record<string, unknown>))
  const validate = validators.get(key)!
  assert.equal(validate(data), true, `${label}: ${JSON.stringify(validate.errors)}`)
}

export function validarResposta(method: string, path: string, status: number, data: unknown) {
  const actual = path.split('?')[0].split('/')
  const match = Object.entries(openApiDocument.paths).find(([template, operations]) => operations[method.toLowerCase()] && template.split('/').length === actual.length
    && template.split('/').every((part, index) => part.startsWith('{') || part === actual[index]))
  assert.ok(match, `Rota ausente no contrato: ${method} ${path}`)
  const response = match[1][method.toLowerCase()].responses[status]
  assert.ok(response, `Status ausente no contrato: ${method} ${path} ${status}`)
  if (status === 204) return
  const schema = response.content?.['application/json']?.schema
  assert.ok(schema, `Schema JSON ausente: ${method} ${path} ${status}`)
  validarDados(schema, data, `${method} ${path} ${status}`)
}
