import { writeFile } from 'node:fs/promises'
import { openApiDocument } from '../openapi.js'

await writeFile('documentacao/openapi.json', `${JSON.stringify(openApiDocument, null, 2)}\n`)
console.log('Contrato exportado para documentacao/openapi.json. Não contém tokens nem credenciais locais.')
