import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readFile } from 'node:fs/promises'
import { FRONT_PREFIX } from '../../codigo/modulos/integracao/frontend-compat.js'

// Usa uma cópia separada do frontend: não faz checkout, merge nem substitui a interface atual.
if (!process.env.PR2_FRONTEND_PATH) throw new Error('Defina PR2_FRONTEND_PATH para a pasta interface da cópia do PR #2.')
const root = resolve(process.env.PR2_FRONTEND_PATH)
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as { dependencies?: Record<string, string> }
if (!manifest.dependencies?.glisse || !manifest.dependencies?.react) throw new Error('A pasta informada não corresponde ao frontend esperado do PR #2.')
const target = process.env.PR2_API_URL || 'http://127.0.0.1:3000'
const url = new URL(target)
if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
  throw new Error('PR2_API_URL deve informar somente a origem da API, sem credenciais ou caminho.')
}
const port = Number(process.env.PR2_FRONTEND_PORT || 5182)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PR2_FRONTEND_PORT inválida.')
const { createServer } = await import(pathToFileURL(join(root, 'node_modules/vite/dist/node/index.js')).href)
const server = await createServer({ root, configFile: join(root, 'vite.config.ts'), server: {
  host: '127.0.0.1', port, strictPort: true,
  proxy: { '/api': { target: url.origin, changeOrigin: true, rewrite: (path: string) => path.replace(/^\/api(?=\/|$)/, FRONT_PREFIX) } },
} })
await server.listen()
server.printUrls()
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void server.close() })
