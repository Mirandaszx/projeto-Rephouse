import { createServer } from 'node:http'
import { randomBytes, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../dist/', import.meta.url)).replace(/[\\/]$/, '')
const port = Number(process.env.PORT || 5182)
const email = 'admin.teste@rephouse.local'
const password = randomBytes(9).toString('base64url')
const tokens = new Map()
const profile = { id: 'master-fixture', nome: 'Admin de teste', email, tipoUsuario: 'USUARIO_MASTER', membro: null }
const houseEmail = 'republica.teste@rephouse.local'
const memberId = '2ba0a5d4-8326-43ca-894a-3ec489dc371c'
const otherMemberId = '8f0d3388-53e3-4e8e-a71c-af313609caad'
const houseProfile = { id: 'casa-admin-fixture', nome: 'Ana Costa', email: houseEmail, tipoUsuario: 'USUARIO_ADMIN', membro: { id: memberId } }
const tasks = [
  { id: randomUUID(), titulo: 'Separar a reciclagem', descricao: 'Levar os recicláveis para a coleta do prédio.', prazo: '2026-11-12', responsavelId: memberId, status: 'ABERTA' },
  { id: randomUUID(), titulo: 'Conferir os itens da despensa', descricao: 'Anotar o que precisa entrar na próxima compra.', prazo: '2026-11-14', responsavelId: otherMemberId, status: 'ABERTA' },
  { id: randomUUID(), titulo: 'Organizar a cozinha', descricao: null, prazo: '2026-11-09', responsavelId: memberId, status: 'CONCLUIDA' },
]
const houseFixtures = {
  '/api/republicas/atual': { id: 'casa-1', nome: 'Casa Ipê', codigoEntrada: 'IPE2026', adminId: houseProfile.id },
  '/api/membros': [
    { id: memberId, ativo: true, usuario: { id: houseProfile.id, nome: houseProfile.nome } },
    { id: otherMemberId, ativo: true, usuario: { id: 'casa-morador-fixture', nome: 'Lucas Lima' } },
  ],
  '/api/despesas': [
    { id: randomUUID(), titulo: 'Internet de novembro', categoria: 'Serviços', valorTotal: '130.00', vencimento: '2026-11-12', rateios: [
      { id: randomUUID(), membroId: memberId, valorDevido: '65.00', valorPago: '0.00' },
      { id: randomUUID(), membroId: otherMemberId, valorDevido: '65.00', valorPago: '65.00' },
    ] },
    { id: randomUUID(), titulo: 'Compras da casa', categoria: 'Mercado', valorTotal: '120.40', vencimento: '2026-11-15', rateios: [
      { id: randomUUID(), membroId: memberId, valorDevido: '60.20', valorPago: '0.00' },
      { id: randomUUID(), membroId: otherMemberId, valorDevido: '60.20', valorPago: '0.00' },
    ] },
  ],
}
const fixtures = {
  '/api/master/dashboard': { republicas: 2, usuarios: 3, totalPendente: '185.40', totalPagoNoMes: '512.00', tarefasAbertas: 4,
    historicoIlustrativo: [{ mes: 'Jun', valor: 340 }, { mes: 'Jul', valor: 480 }, { mes: 'Ago', valor: 410 }, { mes: 'Set', valor: 620 }, { mes: 'Out', valor: 560 }, { mes: 'Nov', valor: 512 }],
  },
  '/api/master/republicas': [
    { id: 'casa-1', nome: 'Casa Ipê', ativa: true },
    { id: 'casa-2', nome: 'Vila Aurora', ativa: false },
  ],
  '/api/master/usuarios': [
    { id: 'p1', nome: 'Ana Costa', email: 'ana@example.test', ativo: true },
    { id: 'p2', nome: 'Lucas Lima', email: 'lucas@example.test', ativo: true },
    { id: 'p3', nome: 'Marina Alves', email: 'marina@example.test', ativo: false },
  ],
}
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }

function json(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(value))
}

function error(response, status, message) {
  json(response, status, { error: { message } })
}

async function readJson(request) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > 4096) return null
  }
  try { return JSON.parse(body) } catch { return null }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1')
  // Prévia isolada, apenas em loopback, sem banco de produção ou contas reais.
  if (request.method === 'GET' && ['/preview/master', '/preview/republica'].includes(url.pathname)) {
    const master = url.pathname === '/preview/master'
    const token = randomBytes(32).toString('hex')
    tokens.set(token, master ? profile : houseProfile)
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    response.end(`<!doctype html><html lang="pt-BR"><title>Prévia RepHouse</title><p>Abrindo prévia de teste…</p><script>sessionStorage.setItem("rephouse-token",${JSON.stringify(token)});location.replace(${JSON.stringify(master ? '/novo/admin' : '/novo/tarefas')});</script></html>`)
    return
  }
  if (url.pathname.startsWith('/api/')) {
    if (request.method === 'POST' && url.pathname === '/api/auth/register') {
      const credentials = await readJson(request)
      if (typeof credentials?.nome !== 'string' || !credentials.nome.trim() || typeof credentials.email !== 'string' || !credentials.email.includes('@') || typeof credentials.senha !== 'string' || credentials.senha.length < 8) return error(response, 400, 'Informe nome, e-mail e senha com pelo menos oito caracteres.')
      houseProfile.nome = credentials.nome.trim()
      houseProfile.email = credentials.email
      houseFixtures['/api/membros'][0].usuario.nome = houseProfile.nome
      const token = randomBytes(32).toString('hex')
      tokens.set(token, houseProfile)
      return json(response, 201, { token, usuario: houseProfile })
    }
    if (request.method === 'POST' && url.pathname === '/api/auth/login') {
      const credentials = await readJson(request)
      const actor = [profile, houseProfile].find(item => item.email === credentials?.email)
      if (!actor || credentials?.senha !== password) return error(response, 401, 'E-mail ou senha inválidos.')
      const token = randomBytes(32).toString('hex')
      tokens.set(token, actor)
      return json(response, 200, { token, usuario: actor })
    }
    const token = request.headers.authorization?.replace(/^Bearer /, '')
    const actor = tokens.get(token)
    if (!actor) return error(response, 401, 'Entre com a conta de teste.')
    if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
      tokens.delete(token)
      response.writeHead(204).end()
      return
    }
    if (request.method === 'GET' && url.pathname === '/api/me') return json(response, 200, actor)
    if (actor === profile && request.method === 'GET' && Object.hasOwn(fixtures, url.pathname)) return json(response, 200, fixtures[url.pathname])
    if (actor === houseProfile) {
      if (url.pathname === '/api/despesas' && request.method === 'POST') {
        const body = await readJson(request)
        const ids = Array.isArray(body?.membroIds) ? [...new Set(body.membroIds)] : []
        const cents = Math.round(Number(body?.valorTotal) * 100)
        if (typeof body?.titulo !== 'string' || !body.titulo.trim() || !Number.isSafeInteger(cents) || cents <= 0 || !ids.length || ids.some(id => ![memberId, otherMemberId].includes(id))) return error(response, 400, 'Informe a despesa, o valor e os moradores do rateio.')
        const expense = { id: randomUUID(), titulo: body.titulo, categoria: body.categoria, valorTotal: (cents / 100).toFixed(2), vencimento: body.vencimento,
          rateios: ids.map((id, index) => ({ id: randomUUID(), membroId: id, valorDevido: ((Math.floor(cents / ids.length) + (index < cents % ids.length ? 1 : 0)) / 100).toFixed(2), valorPago: '0.00' })),
        }
        houseFixtures['/api/despesas'].unshift(expense)
        return json(response, 201, expense)
      }
      if (url.pathname === '/api/pagamentos' && request.method === 'POST') {
        const chunks = []
        let size = 0
        for await (const chunk of request) {
          size += chunk.length
          if (size > 6 * 1024 * 1024) return error(response, 413, 'Arquivo muito grande para a prévia.')
          chunks.push(chunk)
        }
        let form
        try { form = await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': request.headers['content-type'] || '' } }).formData() }
        catch { return error(response, 400, 'Pagamento inválido.') }
        const share = houseFixtures['/api/despesas'].flatMap(expense => expense.rateios).find(item => item.id === form.get('rateioId'))
        const cents = Math.round(Number(form.get('valor')) * 100)
        if (!share || share.membroId !== memberId || !Number.isSafeInteger(cents) || cents <= 0 || cents > Math.round((Number(share.valorDevido) - Number(share.valorPago)) * 100)) return error(response, 400, 'Confira o rateio e o valor do pagamento.')
        share.valorPago = ((Math.round(Number(share.valorPago) * 100) + cents) / 100).toFixed(2)
        return json(response, 201, { id: randomUUID() })
      }
      if (request.method === 'GET' && Object.hasOwn(houseFixtures, url.pathname)) return json(response, 200, houseFixtures[url.pathname])
      if (request.method === 'GET' && url.pathname === '/api/dashboard') {
        const shares = houseFixtures['/api/despesas'].flatMap(expense => expense.rateios)
        const paid = shares.reduce((sum, share) => sum + Math.round(Number(share.valorPago) * 100), 0)
        const due = shares.reduce((sum, share) => sum + Math.round(Number(share.valorDevido) * 100), 0)
        return json(response, 200, { totalPendente: ((due - paid) / 100).toFixed(2), totalPagoNoMes: (paid / 100).toFixed(2), moradoresAtivos: 2, tarefasAbertas: tasks.filter(item => item.status === 'ABERTA').length, proximasContas: [] })
      }
      if (url.pathname === '/api/tarefas' && request.method === 'GET') return json(response, 200, tasks)
      if (url.pathname === '/api/tarefas' && request.method === 'POST') {
        const body = await readJson(request)
        if (typeof body?.titulo !== 'string' || ![memberId, otherMemberId].includes(body.responsavelId)) return error(response, 400, 'Informe o título e o responsável.')
        const task = { id: randomUUID(), titulo: body.titulo, descricao: body.descricao ?? null, prazo: body.prazo ?? null, responsavelId: body.responsavelId, status: 'ABERTA' }
        tasks.unshift(task)
        return json(response, 201, task)
      }
      if (url.pathname.startsWith('/api/tarefas/') && request.method === 'PATCH') {
        const task = tasks.find(item => item.id === url.pathname.split('/').pop())
        const body = await readJson(request)
        if (!task) return error(response, 404, 'Tarefa não encontrada.')
        if (!['ABERTA', 'CONCLUIDA'].includes(body?.status)) return error(response, 400, 'Status inválido.')
        task.status = body.status
        return json(response, 200, task)
      }
    }
    return error(response, 404, 'Ação indisponível nesta prévia com dados de teste.')
  }
  if (request.method !== 'GET') return error(response, 405, 'Método indisponível.')
  try {
    const pathname = decodeURIComponent(url.pathname)
    const file = extname(pathname) ? resolve(dist, '.' + pathname) : resolve(dist, 'index.html')
    if (!file.startsWith(dist + sep)) return error(response, 404, 'Arquivo não encontrado.')
    const body = await readFile(file)
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
    response.end(body)
  } catch {
    error(response, 404, 'Arquivo não encontrado.')
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log('RepHouse — prévia local com dados fictícios, sem conexão ao banco. Reinicie para restaurar os dados.')
  console.log(JSON.stringify({ home: `http://127.0.0.1:${port}/`, master: `http://127.0.0.1:${port}/preview/master`, republica: `http://127.0.0.1:${port}/preview/republica`, email, houseEmail, password }, null, 2))
})
server.on('error', error => { console.error(error.message); process.exitCode = 1 })
