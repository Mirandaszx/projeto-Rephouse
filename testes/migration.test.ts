import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import pg from 'pg'
import { createDatabase } from '../codigo/infraestrutura/banco/client.js'
import { createApp } from '../codigo/app.js'

const url = process.env.TEST_DATABASE_URL
const dedicated = url && new URL(url).pathname === '/rabbu_mvp_test'
interface User { id: string; nome: string; email: string; tipoUsuario: string }
interface Session { token: string; usuario: User }
interface Member { id: string; usuarioId: string; ativo: boolean }
interface Rateio { id: string; membroId: string; valorDevido: string; valorPago: string; status: string }
interface Expense { id: string; rateios: Rateio[]; status: string; titulo: string }

test('migração: jornada HTTP, privacidade, exclusão e concorrência', { skip: !dedicated, timeout: 90000 }, async t => {
  assert.ok(url)
  // Cada execução usa seu próprio schema. DROP CASCADE remove somente fixtures desta execução.
  const schema = `migration_test_${randomUUID().replaceAll('-', '')}`
  const setup = new pg.Client({ connectionString: url, options: `-c search_path=${schema}` })
  await setup.connect()
  await setup.query(`CREATE SCHEMA "${schema}"`)
  const isolated = new URL(url)
  isolated.searchParams.set('schema', schema)
  const db = createDatabase(isolated.toString())
  const directory = await mkdtemp(join(tmpdir(), 'rephouse-receipts-'))
  let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined
  try {
    for (const migration of (await readdir('prisma/migracoes')).filter(n => /^\d/.test(n)).sort()) {
      await setup.query(await readFile(`prisma/migracoes/${migration}/migration.sql`, 'utf8'))
    }
    server = createApp({ database: db, jwtSecret: 'segredo-de-testes-isolados-com-mais-de-32-caracteres', uploadDirectory: directory }).listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    const base = `http://127.0.0.1:${address.port}`
    async function request<T = Record<string, unknown>>(method: string, path: string, token?: string, data?: unknown, key?: string) {
      const headers: Record<string,string> = { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      if (key) headers['Idempotency-Key'] = key
      const form = data instanceof FormData
      if (data && !form) headers['Content-Type'] = 'application/json'
      const res = await fetch(`${base}${path}`, { method, headers, body: data ? form ? data : JSON.stringify(data) : undefined })
      const content = await res.text()
      return { status: res.status, body: (content ? JSON.parse(content) : {}) as T }
    }
    const senha = 'Senha-forte-de-testes123!'
    async function register(nome: string) {
      const res = await request<Session>('POST','/api/auth/register', undefined, { nome, email: `${randomUUID()}@example.test`, senha })
      assert.equal(res.status, 201, JSON.stringify(res.body))
      return res.body
    }
    const admin = await register('Admin A')
    const morador = await register('Morador')
    const adminB = await register('Admin B')
    const master = await register('Master')
    const republicA = await request<{id:string;codigoEntrada:string}>('POST','/api/republicas',admin.token,{nome:'Casa A',endereco:'Rua A'})
    const republicB = await request<{id:string;codigoEntrada:string}>('POST','/api/republicas',adminB.token,{nome:'Casa B'})
    assert.equal(republicA.status,201)
    assert.equal(republicB.status,201)
    await db.usuario.update({ where: { id: master.usuario.id }, data: { tipoUsuario: 'USUARIO_MASTER' } })
    let membro: Member
    let adminMember: Member
    let expense: Expense

    await t.test('cadastro independente, perfil NORMAL e rejeição de privilégio fornecido pelo cliente', async () => {
      assert.equal(morador.usuario.tipoUsuario, 'USUARIO_NORMAL')
      const me = await request<{membro:null}>('GET','/api/me',morador.token)
      assert.equal(me.body.membro,null)
      const unsafe = await request('POST','/api/auth/register',undefined,{nome:'Invasor',email:'unsafe@example.test',senha,tipoUsuario:'USUARIO_MASTER'})
      assert.equal(unsafe.status,400)
      const signed = await request<Session>('POST','/api/auth/login',undefined,{email:morador.usuario.email.toUpperCase(),senha})
      assert.equal(signed.status,200)
      assert.equal((await request('POST','/api/auth/login',undefined,{email:morador.usuario.email,senha:'incorreta123'})).status,401)
    })
    await t.test('entrada por código, membro único e isolamento de repúblicas', async () => {
      const joined = await request<Member>('POST','/api/republicas/entrar',morador.token,{codigoEntrada:republicA.body.codigoEntrada})
      assert.equal(joined.status,201)
      membro = joined.body
      const members = await request<Member[]>('GET','/api/membros',admin.token)
      adminMember = members.body.find(m => m.usuarioId === admin.usuario.id)!
      assert.equal((await request('POST','/api/republicas/entrar',morador.token,{codigoEntrada:republicB.body.codigoEntrada})).status,409)
      assert.equal((await request('GET','/api/master/usuarios',morador.token)).status,403)
      assert.equal((await request('POST','/api/tarefas',morador.token,{titulo:'Proibida',responsavelId:membro.id})).status,403)
    })
    await t.test('despesa e rateio fecham exatamente, sem aceitar identidade do cliente', async () => {
      const external = await db.membroRepublica.findFirstOrThrow({where:{republicaId:republicB.body.id}})
      const before = await db.despesa.count()
      assert.equal((await request('POST','/api/despesas',admin.token,{titulo:'Inválida',categoria:'OUTROS',valorTotal:'1.00',vencimento:'2030-01-15',membroIds:[external.id]})).status,400)
      assert.equal(await db.despesa.count(),before)
      const created = await request<Expense>('POST','/api/despesas',admin.token,{titulo:'Internet',categoria:'INTERNET',valorTotal:'100.00',vencimento:'2030-01-15',membroIds:[adminMember.id,membro.id]})
      assert.equal(created.status,201,JSON.stringify(created.body))
      expense = created.body
      assert.deepEqual(expense.rateios.map(r => r.valorDevido),['50.00','50.00'])
      assert.equal((await request('GET',`/api/despesas/${expense.id}`,adminB.token)).status,404)
      assert.equal((await request('POST','/api/despesas',morador.token,{titulo:'Invasão',categoria:'OUTROS',valorTotal:'1.00',vencimento:'2030-01-15',membroIds:[membro.id]})).status,403)
    })
    const ownRateio = () => expense.rateios.find(r => r.membroId === membro.id)!
    await t.test('pagamento parcial idempotente e rejeição de dados divergentes', async () => {
      const key = randomUUID()
      const input = {rateioId:ownRateio().id,valor:'20.00'}
      const [first, concurrent] = await Promise.all([1,2].map(() => request<{id:string;valor:string}>('POST','/api/pagamentos',morador.token,input,key)))
      assert.ok(first && concurrent)
      assert.equal(first.status,201,JSON.stringify(first.body))
      assert.equal(concurrent.status,201,JSON.stringify(concurrent.body))
      assert.equal(concurrent.body.id,first.body.id)
      assert.equal(await db.pagamento.count({where:{chaveIdempotencia:key}}),1)
      const replay = await request<{id:string}>('POST','/api/pagamentos',morador.token,input,key)
      assert.equal(replay.status,201)
      assert.equal(replay.body.id,first.body.id)
      assert.equal((await request('POST','/api/pagamentos',morador.token,{...input,valor:'21.00'},key)).status,409)
      assert.equal((await request('POST','/api/pagamentos',adminB.token,input,randomUUID())).status,404)
      assert.equal((await db.rateioDespesa.findUniqueOrThrow({where:{id:ownRateio().id}})).valorPago.toFixed(2),'20.00')
    })
    await t.test('exclusão bloqueia administração pendente e dívidas, inclusive antigas', async () => {
      assert.equal((await request('DELETE','/api/me',admin.token,{senha})).status,409)
      const debt = await request<{error:{code:string}}>('DELETE','/api/me',morador.token,{senha})
      assert.equal(debt.status,409)
      assert.equal(debt.body.error.code,'OUTSTANDING_DEBT')
      assert.equal((await request('POST','/api/republicas/sair',admin.token)).status,409)
    })
    await t.test('troca com dívida mantém acesso somente ao próprio histórico', async () => {
      const swap = await request('POST','/api/republicas/trocar',morador.token,{codigoEntrada:republicB.body.codigoEntrada})
      assert.equal(swap.status,200)
      assert.equal((await request('GET',`/api/despesas/${expense.id}`,morador.token)).status,404)
      const old = await request<Rateio[]>('GET','/api/me/financeiro',morador.token)
      assert.equal(old.status,200)
      assert.equal(old.body.find(r => r.id === ownRateio().id)?.valorPago,'20.00')
      assert.equal((await request('DELETE','/api/me',morador.token,{senha})).status,409)
      assert.equal((await request('GET',`/api/me/financeiro/${expense.rateios.find(r=>r.membroId===adminMember.id)!.id}`,morador.token)).status,404)
    })
    await t.test('pagamentos simultâneos nunca ultrapassam o saldo', async () => {
      const results = await Promise.all([1,2].map(() => request('POST','/api/pagamentos',morador.token,{rateioId:ownRateio().id,valor:'20.00'},randomUUID())))
      assert.deepEqual(results.map(r=>r.status).sort(),[201,409])
      const rateio = await db.rateioDespesa.findUniqueOrThrow({where:{id:ownRateio().id}})
      assert.equal(rateio.valorPago.toFixed(2),'40.00')
      assert.equal(rateio.status,'PARCIAL')
    })
    let paymentWithFile = ''
    await t.test('comprovante válido é privado; entrada falsa e excesso de tamanho são recusados', async () => {
      const form = new FormData()
      form.set('rateioId',ownRateio().id)
      form.set('valor','10.00')
      form.set('comprovante',new Blob(['%PDF-1.4\ncomprovante de teste\n%%EOF'],{type:'application/pdf'}),'conta.pdf')
      const paid = await request<{id:string}>('POST','/api/pagamentos',morador.token,form,randomUUID())
      assert.equal(paid.status,201,JSON.stringify(paid.body))
      paymentWithFile = paid.body.id
      const download = await fetch(`${base}/api/pagamentos/${paymentWithFile}/comprovante`,{headers:{Authorization:`Bearer ${morador.token}`}})
      assert.equal(download.status,200)
      assert.equal(download.headers.get('x-content-type-options'),'nosniff')
      await download.arrayBuffer()
      assert.equal((await request('GET',`/api/pagamentos/${paymentWithFile}/comprovante`,adminB.token)).status,404)
      for (const [contents,status] of [[new Blob(['arquivo falso'],{type:'application/pdf'}),400],[new Blob([new Uint8Array(5*1024*1024+1)]),413]] as const) {
        const invalid = new FormData()
        invalid.set('rateioId',ownRateio().id); invalid.set('valor','1.00'); invalid.set('comprovante',contents,'falso.pdf')
        assert.equal((await request('POST','/api/pagamentos',morador.token,invalid,randomUUID())).status,status)
      }
    })
    await t.test('somente o responsável conclui tarefas; troca inválida sofre rollback', async () => {
      const members = await request<Member[]>('GET','/api/membros',adminB.token)
      const newMember = members.body.find(m=>m.usuarioId===morador.usuario.id)!
      const task = await request<{id:string}>('POST','/api/tarefas',adminB.token,{titulo:'Cozinha',responsavelId:newMember.id})
      assert.equal(task.status,201)
      const vizinho = await register('Vizinho')
      assert.equal((await request('POST','/api/republicas/entrar',vizinho.token,{codigoEntrada:republicB.body.codigoEntrada})).status,201)
      assert.equal((await request('PATCH',`/api/tarefas/${task.body.id}`,vizinho.token,{status:'CONCLUIDA'})).status,403)
      assert.equal((await request('PATCH',`/api/tarefas/${task.body.id}`,morador.token,{status:'CONCLUIDA'})).status,200)
      assert.equal((await request('PATCH',`/api/tarefas/${task.body.id}`,morador.token,{titulo:'Outra'})).status,403)
      assert.equal((await request('POST','/api/republicas/trocar',morador.token,{codigoEntrada:'INVALIDO'})).status,404)
      const current = await request<{id:string}>('GET','/api/republicas/atual',morador.token)
      assert.equal(current.body.id,republicB.body.id)
    })
    await t.test('dashboard contabiliza parciais e dívidas de ex-moradores', async () => {
      const dashboard = await request<{totalPendente:string;totalPagoNoMes:string}>('GET','/api/dashboard',admin.token)
      assert.equal(dashboard.body.totalPendente,'50.00')
      assert.equal(dashboard.body.totalPagoNoMes,'50.00')
    })
    await t.test('transferência explícita mantém um admin e bloqueia transferência externa', async () => {
      const external = await db.membroRepublica.findFirstOrThrow({where:{republicaId:republicB.body.id,usuarioId:adminB.usuario.id}})
      assert.equal((await request('POST','/api/republicas/transferir-admin',admin.token,{membroId:external.id})).status,404)
      const joined = await request<Member>('POST','/api/republicas/trocar',morador.token,{codigoEntrada:republicA.body.codigoEntrada})
      assert.equal(joined.status,200)
      assert.equal(joined.body.id,membro.id)
      assert.equal((await request('POST','/api/republicas/transferir-admin',admin.token,{membroId:membro.id})).status,200)
      assert.equal((await request('GET','/api/me',admin.token)).status,200)
      assert.equal((await db.usuario.findUniqueOrThrow({where:{id:admin.usuario.id}})).tipoUsuario,'USUARIO_NORMAL')
      assert.equal((await request('POST','/api/republicas/transferir-admin',morador.token,{membroId:adminMember.id})).status,200)
    })
    await t.test('exclusão lógica preserva pagamento, invalida login e não permite reativação', async () => {
      assert.equal((await request('DELETE','/api/me',morador.token,{senha:'errada123'})).status,401)
      assert.equal((await request('DELETE','/api/me',morador.token,{senha})).status,204)
      assert.equal((await request('GET','/api/me',morador.token)).status,401)
      assert.equal((await request('POST','/api/auth/login',undefined,{email:morador.usuario.email,senha})).status,401)
      const deleted = await db.usuario.findUniqueOrThrow({where:{id:morador.usuario.id}})
      assert.equal(deleted.ativo,false)
      assert.ok(deleted.excluidoEm)
      assert.ok(await db.pagamento.findUnique({where:{id:paymentWithFile}}))
      assert.equal((await request('PATCH',`/api/master/usuarios/${morador.usuario.id}/status`,master.token,{ativo:true})).status,409)
    })
    await t.test('conta sem república pode ser excluída; último MASTER permanece ativo', async () => {
      const independent = await register('Sem república')
      assert.equal((await request('DELETE','/api/me',independent.token,{senha})).status,204)
      const last = await request<{error:{code:string}}>('DELETE','/api/me',master.token,{senha})
      assert.equal(last.status,409)
      assert.equal(last.body.error.code,'LAST_MASTER')
      assert.equal((await request('PATCH',`/api/master/usuarios/${master.usuario.id}/status`,master.token,{ativo:false})).status,409)
    })
    await t.test('MASTER opera globalmente; bloqueio e logout invalidam acesso', async () => {
      assert.equal((await request('GET','/api/master/usuarios',master.token)).status,200)
      const users = await request<User[]>('GET','/api/master/usuarios',master.token)
      assert.ok(!JSON.stringify(users.body).includes('senhaHash'))
      assert.equal((await request('GET',`/api/master/republicas/${republicA.body.id}/despesas`,master.token)).status,200)
      assert.equal((await request('PATCH',`/api/master/republicas/${republicB.body.id}/status`,master.token,{ativa:false})).status,200)
      assert.equal((await request('GET','/api/dashboard',adminB.token)).status,403)
      await request('PATCH',`/api/master/republicas/${republicB.body.id}/status`,master.token,{ativa:true})
      assert.equal((await request('PATCH',`/api/master/usuarios/${adminB.usuario.id}/status`,master.token,{ativo:false})).status,200)
      assert.equal((await request('GET','/api/me',adminB.token)).status,401)
      assert.equal((await request('PATCH',`/api/master/usuarios/${adminB.usuario.id}/status`,master.token,{ativo:true})).status,200)
      assert.equal((await request('GET','/api/me',adminB.token)).status,401)
      const signed = await request<Session>('POST','/api/auth/login',undefined,{email:adminB.usuario.email,senha})
      assert.equal(signed.status,200)
      assert.equal((await request('POST','/api/auth/logout',signed.body.token)).status,204)
      assert.equal((await request('GET','/api/me',signed.body.token)).status,401)
    })
  } finally {
    if (server) { server.closeAllConnections(); await new Promise<void>(done=>server!.close(()=>done())) }
    await db.$disconnect()
    if (!/^migration_test_[a-f0-9]{32}$/.test(schema)) throw new Error('Schema temporário inválido.')
    await setup.query('ROLLBACK')
    await setup.query(`DROP SCHEMA "${schema}" CASCADE`)
    await setup.end()
    if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith('rephouse-receipts-')) throw new Error('Diretório temporário inválido.')
    await rm(directory,{recursive:true,force:true})
  }
})
