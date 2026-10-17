import { randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { parse } from 'dotenv'

const content = await readFile('.env', 'utf8')
if (parse(content).JWT_SECRET) {
  console.log('JWT_SECRET já está configurado; nenhuma alteração foi feita.')
} else {
  // O segredo permanece exclusivamente no .env local, sem aparecer no terminal.
  const line = `JWT_SECRET=${randomBytes(48).toString('base64url')}`
  const updated = /^JWT_SECRET=.*$/m.test(content) ? content.replace(/^JWT_SECRET=.*$/m, line) : `${content.trimEnd()}\n${line}\n`
  await writeFile('.env', updated, { mode: 0o600 })
  console.log('JWT_SECRET configurado no .env local.')
}
