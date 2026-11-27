import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import type { Express } from 'express'
import { createApp } from '../codigo/app.js'
import { loadEnv } from '../codigo/configuracao/env.js'

// Deploy num único serviço (Render): a API serve a interface e traduz /api para a superfície da interface.
async function comServidor(app: Express, operacao: (baseUrl: string) => Promise<void>): Promise<void> {
  const servidor = app.listen(0, '127.0.0.1')
  try {
    await once(servidor, 'listening')
    const endereco = servidor.address()
    assert.ok(endereco && typeof endereco !== 'string')
    await operacao(`http://127.0.0.1:${endereco.port}`)
  } finally {
    await new Promise<void>((resolve, reject) => { servidor.close(erro => erro ? reject(erro) : resolve()) })
  }
}

async function comInterface(operacao: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'rephouse-interface-'))
  try {
    await mkdir(join(dir, 'assets'))
    await writeFile(join(dir, 'index.html'), '<!doctype html><title>RepHouse</title><script>document.documentElement.dataset.ok="1"</script><div id="root"></div><script type="module" src="/assets/app-abc123.js"></script>')
    await writeFile(join(dir, 'assets', 'app-abc123.js'), 'console.log("ok")')
    await operacao(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('com INTERFACE_DIR, a API entrega a interface e mantém as rotas operacionais', async () => {
  await comInterface(async dir => {
    await comServidor(createApp({ interfaceDir: dir }), async base => {
      const inicio = await fetch(`${base}/republica/despesas`)
      assert.equal(inicio.status, 200)
      assert.match(await inicio.text(), /<div id="root">/)
      assert.equal(inicio.headers.get('cache-control'), 'no-store')
      const csp = inicio.headers.get('content-security-policy') ?? ''
      const hash = createHash('sha256').update('document.documentElement.dataset.ok="1"').digest('base64')
      assert.ok(csp.includes(`script-src 'self' 'sha256-${hash}' https://accounts.google.com/gsi/client`), 'o script embutido entra pelo hash, sem unsafe-inline')
      const scriptSrc = csp.split(';').find(directive => directive.trim().startsWith('script-src')) ?? ''
      assert.doesNotMatch(scriptSrc, /unsafe-inline/)
      assert.match(csp, /frame-src https:\/\/accounts\.google\.com\/gsi\//)
      assert.equal(inicio.headers.get('cross-origin-opener-policy'), 'same-origin-allow-popups')

      const asset = await fetch(`${base}/assets/app-abc123.js`)
      assert.equal(asset.status, 200)
      assert.match(asset.headers.get('cache-control') ?? '', /immutable/)

      assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { status: 'ok' })
      const privacidade = await fetch(`${base}/api/privacidade`)
      assert.equal(privacidade.status, 200, 'a superfície da interface responde em /api')
      const inexistente = await fetch(`${base}/api/rota-que-nao-existe`)
      assert.equal(inexistente.status, 404)
      assert.match(inexistente.headers.get('content-type') ?? '', /application\/json/, 'rotas de API desconhecidas não devolvem a página')
    })
  })
})

test('sem INTERFACE_DIR, a API não serve páginas nem traduz /api', async () => {
  await comServidor(createApp(), async base => {
    assert.equal((await fetch(`${base}/republica`)).status, 404)
    assert.doesNotMatch((await fetch(`${base}/api/health`)).headers.get('content-security-policy') ?? '', /accounts\.google\.com/)
  })
})

test('no Render, o endereço público vira a origem permitida e o endereço dos links de e-mail', () => {
  const base = { DATABASE_URL: 'postgresql://u:p@localhost:5432/db', JWT_SECRET: 'x'.repeat(40), RENDER_EXTERNAL_URL: 'https://rephouse.onrender.com' }
  const semEmail = loadEnv(base)
  assert.deepEqual(semEmail.CORS_ORIGINS, ['https://rephouse.onrender.com'])
  assert.equal(semEmail.APP_PUBLIC_URL, undefined, 'sem provedor de e-mail, nenhum link é montado')
  const comEmail = loadEnv({ ...base, NODE_ENV: 'production', BREVO_API_KEY: 'xkeysib-teste', EMAIL_FROM: 'contato@exemplo.com' })
  assert.equal(comEmail.APP_PUBLIC_URL, 'https://rephouse.onrender.com')
  const explicito = loadEnv({ ...base, CORS_ORIGINS: 'https://rephouse.exemplo.com' })
  assert.deepEqual(explicito.CORS_ORIGINS, ['https://rephouse.exemplo.com'], 'valor informado tem prioridade')
})
