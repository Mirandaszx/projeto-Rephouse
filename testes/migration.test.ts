import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { once } from 'node:events'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import pg from 'pg'
import { SignJWT } from 'jose'
import { createDatabase } from '../codigo/infraestrutura/banco/client.js'
import { createApp } from '../codigo/app.js'
import { validarResposta } from './auxiliares/contrato.js'
import { demonstracao, semearDemonstracao } from '../codigo/infraestrutura/banco/demonstracao.js'
import {pagar,baixarComprovante,ErroResposta} from '../integracao/exemplos.js'

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
    server = createApp({ database: db, jwtSecret: 'segredo-de-testes-isolados-com-mais-de-32-caracteres' }).listen(0, '127.0.0.1')
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
      assert.match(res.headers.get('x-request-id') ?? '',/^[a-f0-9-]{36}$/)
      const content = await res.text()
      const body = content ? JSON.parse(content) : {}
      validarResposta(method, path.split('?')[0]!, res.status, body)
      // Valida o envelope real antes de adaptar os helpers de negócio da jornada.
      return { status: res.status, body: (method==='GET'&&Array.isArray(body.dados)?body.dados:body) as T, json:body,headers:res.headers }
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
    await t.test('todas as famílias de rotas MASTER recusam NORMAL e ADMIN e não alteram o banco', async () => {
      const prefix=`/api/master/republicas/${republicA.body.id}`
      const routes: [string,string,unknown?][] = [
        ['GET','/api/master/usuarios'],['GET','/api/master/republicas'],['GET','/api/master/dashboard'],
        ['PATCH',`/api/master/usuarios/${adminB.usuario.id}/status`,{ativo:false}],
        ['PATCH',`/api/master/republicas/${republicA.body.id}/status`,{ativa:false}],
        ['GET',prefix],['PATCH',prefix,{nome:'Invasão'}],['GET',`${prefix}/membros`],
        ['PATCH',`${prefix}/membros/${membro.id}`,{ativo:false}],
        ['POST',`${prefix}/transferir-admin`,{membroId:membro.id}],
        ['GET',`${prefix}/despesas`],['GET',`${prefix}/despesas/${expense.id}`],
        ['POST',`${prefix}/despesas`,{titulo:'Invasão',categoria:'OUTROS',valorTotal:'1.00',vencimento:'2030-01-01',membroIds:[membro.id]}],
        ['PATCH',`${prefix}/despesas/${expense.id}`,{titulo:'Invasão'}],
        ['GET',`${prefix}/tarefas`],['POST',`${prefix}/tarefas`,{titulo:'Invasão',responsavelId:membro.id}],
        ['PATCH',`${prefix}/tarefas/${randomUUID()}`,{status:'CONCLUIDA'}],['GET',`${prefix}/dashboard`],
      ]
      const before=[await db.despesa.count(),await db.tarefa.count(),await db.membroRepublica.count({where:{ativo:true}})]
      for(const token of [morador.token,admin.token]) for(const [method,path,body] of routes) {
        assert.equal((await request(method,path,token,body)).status,403,`${method} ${path}`)
      }
      assert.deepEqual([await db.despesa.count(),await db.tarefa.count(),await db.membroRepublica.count({where:{ativo:true}})],before)
      assert.equal((await db.republica.findUniqueOrThrow({where:{id:republicA.body.id}})).nome,'Casa A')
      assert.equal((await db.usuario.findUniqueOrThrow({where:{id:adminB.usuario.id}})).ativo,true)
    })
    await t.test('sessão expirada não autoriza nem consulta dados privados', async () => {
      const expired = await new SignJWT({ ver: 0 }).setProtectedHeader({ alg: 'HS256' }).setSubject(morador.usuario.id)
        .setIssuer('rephouse').setAudience('rephouse-api').setExpirationTime(Math.floor(Date.now()/1000)-1)
        .sign(new TextEncoder().encode('segredo-de-testes-isolados-com-mais-de-32-caracteres'))
      assert.equal((await request('GET','/api/me',expired)).status,401)
      assert.equal((await request('GET','/api/dashboard',expired)).status,401)
    })
    await t.test('edição antes/depois do pagamento, estados e limites mensais no horário de Brasília', async () => {
      const memberB = await db.membroRepublica.findFirstOrThrow({where:{usuarioId:adminB.usuario.id,ativo:true}})
      const created = await request<Expense>('POST','/api/despesas',adminB.token,{titulo:'Auditoria',categoria:'OUTROS',valorTotal:'90.00',vencimento:'2001-01-01',membroIds:[memberB.id]})
      assert.equal(created.status,201)
      const path = `/api/despesas/${created.body.id}`
      const edited = await request<Expense>('PATCH',path,adminB.token,{valorTotal:'100.00',membroIds:[memberB.id]})
      assert.equal(edited.status,200)
      assert.equal(edited.body.rateios[0]!.valorDevido,'100.00')
      assert.equal((await request<{statusCalculado:string}>('GET',path,adminB.token)).body.statusCalculado,'VENCIDA')
      assert.equal((await request('PATCH',path,morador.token,{titulo:'Invasão'})).status,403)
      assert.equal((await request('PATCH',path,admin.token,{valorTotal:'5.00'})).status,404)
      const rateio = edited.body.rateios[0]!
      assert.equal((await request('POST','/api/pagamentos',adminB.token,{rateioId:rateio.id,valor:'10.00'},randomUUID())).status,201)
      const before = await db.rateioDespesa.findUniqueOrThrow({where:{id:rateio.id}})
      for (const body of [{valorTotal:'101.00'},{membroIds:[memberB.id]}]) assert.equal((await request('PATCH',path,adminB.token,body)).status,409)
      const unchanged = await db.rateioDespesa.findUniqueOrThrow({where:{id:rateio.id}})
      assert.equal(unchanged.valorDevido.toFixed(2),before.valorDevido.toFixed(2))
      assert.equal(unchanged.valorPago.toFixed(2),'10.00')
      assert.equal((await request('PATCH',path,adminB.token,{titulo:'Renomeada',vencimento:'2099-01-01'})).status,200)
      assert.equal((await request<{statusCalculado:string}>('GET',path,adminB.token)).body.statusCalculado,'PENDENTE')
      const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).formatToParts(new Date())
      const year = Number(parts.find(p=>p.type==='year')!.value), month = Number(parts.find(p=>p.type==='month')!.value)
      const start = Date.UTC(year,month-1,1,3), end = Date.UTC(year,month,1,3)
      // Instantes de fronteira são fixtures de inserção, sem alterar pagamentos históricos.
      for (const [valor,instant] of [['30.00',start-1],['20.00',start],['15.00',end-1],['25.00',end]] as const) {
        await db.pagamento.create({data:{rateioId:rateio.id,membroId:memberB.id,valor,dataPagamento:new Date(instant)}})
      }
      const final = await request<{status:string;statusCalculado:string}>('GET',path,adminB.token)
      assert.equal(final.body.status,'PAGA'); assert.equal(final.body.statusCalculado,'PAGA')
      const dashboard = await request<{totalPendente:string;totalPagoNoMes:string}>('GET','/api/dashboard',adminB.token)
      assert.equal(dashboard.body.totalPendente,'0.00'); assert.equal(dashboard.body.totalPagoNoMes,'45.00')
      assert.equal((await request<{totalPendente:string}>('GET','/api/dashboard',admin.token)).body.totalPendente,'100.00')
    })
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
      assert.equal((await request('POST','/api/pagamentos',admin.token,input,randomUUID())).status,404)
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
      assert.equal((await request<Member[]>('GET','/api/membros',admin.token)).body.some(m=>m.id===membro.id),false)
      // O helper de contrato usa caminho sem query, pois os parâmetros não mudam a operação.
      const history = await fetch(`${base}/api/membros?inativos=true`,{headers:{Authorization:`Bearer ${admin.token}`}})
      assert.equal(history.status,200)
      assert.ok((await history.json() as {dados:Member[]}).dados.some(m=>m.id===membro.id&&!m.ativo))
      assert.equal((await fetch(`${base}/api/membros?inativos=true`,{headers:{Authorization:`Bearer ${morador.token}`}})).status,403)
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
      const key=randomUUID()
      const simultaneous=await Promise.all([1,2].map(()=>request<{id:string}>('POST','/api/pagamentos',morador.token,form,key)))
      const paid=simultaneous[0]!
      assert.deepEqual(simultaneous.map(result=>result.status),[201,201])
      assert.equal(paid.body.id,simultaneous[1]!.body.id)
      assert.equal(paid.status,201,JSON.stringify(paid.body))
      paymentWithFile = paid.body.id
      assert.equal(await db.comprovante.count({where:{pagamentoId:paymentWithFile}}),1)
      const replay=await pagar(base,morador.token,{rateioId:ownRateio().id,valor:'10.00'},key,new Blob(['%PDF-1.4\ncomprovante de teste\n%%EOF'],{type:'application/pdf'}))
      assert.equal(replay.id,paymentWithFile)
      const downloaded=await baixarComprovante(base,morador.token,paymentWithFile)
      assert.ok(downloaded.requestId);assert.equal(await downloaded.arquivo.text(),'%PDF-1.4\ncomprovante de teste\n%%EOF')
      await assert.rejects(pagar(base,morador.token,{rateioId:ownRateio().id,valor:'10.00'},key,new Blob(['%PDF-1.4\nalterado\n%%EOF'])),error=>error instanceof ErroResposta&&error.status===409&&!!error.requestId)
      const download = await fetch(`${base}/api/pagamentos/${paymentWithFile}/comprovante`,{headers:{Authorization:`Bearer ${morador.token}`}})
      assert.equal(download.status,200)
      assert.equal(download.headers.get('x-content-type-options'),'nosniff')
      await download.arrayBuffer()
      for (const token of [admin.token,master.token]) {
        const allowed = await fetch(`${base}/api/pagamentos/${paymentWithFile}/comprovante`,{headers:{Authorization:`Bearer ${token}`}})
        assert.equal(allowed.status,200); await allowed.arrayBuffer()
      }
      assert.equal((await request('GET',`/api/pagamentos/${paymentWithFile}/comprovante`)).status,401)
      assert.equal((await request('GET',`/api/pagamentos/${randomUUID()}/comprovante`,morador.token)).status,404)
      assert.equal((await request('GET',`/api/pagamentos/${paymentWithFile}/comprovante`,adminB.token)).status,404)
      for (const [contents,status] of [[new Blob(['arquivo falso'],{type:'application/pdf'}),400],[new Blob([new Uint8Array(5*1024*1024+1)]),413]] as const) {
        const invalid = new FormData()
        invalid.set('rateioId',ownRateio().id); invalid.set('valor','1.00'); invalid.set('comprovante',contents,'falso.pdf')
        assert.equal((await request('POST','/api/pagamentos',morador.token,invalid,randomUUID())).status,status)
      }
    })
    await t.test('comprovante no banco mantém bytes, headers e URLs públicas em todas as consultas', async () => {
      const paid=await db.pagamento.findUniqueOrThrow({where:{id:paymentWithFile}})
      assert.equal(paid.comprovanteUrl,null)
      const proof=await db.comprovante.findUniqueOrThrow({where:{pagamentoId:paymentWithFile}})
      assert.equal(Buffer.from(proof.conteudo).toString(),'%PDF-1.4\ncomprovante de teste\n%%EOF')
      const download=await fetch(base+'/api/pagamentos/'+paymentWithFile+'/comprovante',{headers:{Authorization:'Bearer '+admin.token}})
      assert.equal(download.status,200);assert.equal(download.headers.get('content-length'),String(proof.tamanho))
      assert.equal(download.headers.get('content-type'),'application/pdf')
      const history=await request('GET','/api/me/financeiro',morador.token)
      assert.ok(JSON.stringify(history.json).includes('/api/pagamentos/'+paymentWithFile+'/comprovante'))
      for(const response of [history.json,(await request('GET','/api/despesas/'+expense.id,admin.token)).json]){
        const json=JSON.stringify(response)
        for(const field of ['conteudo','hashSha256','mimeType','pagamentoId','arquivoHash'])assert.ok(!json.includes('"'+field+'"'))
      }
      assert.deepEqual(await readdir(directory),[])
    })
    await t.test('somente o responsável conclui tarefas; troca inválida sofre rollback', async () => {
      const members = await request<Member[]>('GET','/api/membros',adminB.token)
      const newMember = members.body.find(m=>m.usuarioId===morador.usuario.id)!
      const beforeTasks = await db.tarefa.count()
      assert.equal((await request('POST','/api/tarefas',adminB.token,{titulo:'Inválida',responsavelId:adminMember.id})).status,400)
      assert.equal(await db.tarefa.count(),beforeTasks)
      const task = await request<{id:string}>('POST','/api/tarefas',adminB.token,{titulo:'Cozinha',responsavelId:newMember.id})
      assert.equal(task.status,201)
      assert.ok((await request<{id:string}[]>('GET','/api/tarefas',morador.token)).body.some(item=>item.id===task.body.id))
      assert.ok(!(await request<{id:string}[]>('GET','/api/tarefas',admin.token)).body.some(item=>item.id===task.body.id))
      assert.equal((await request('PATCH',`/api/tarefas/${task.body.id}`,admin.token,{titulo:'Invasão'})).status,404)
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
      const filesBefore=await readdir(directory)
      const deniedUpload=new FormData();deniedUpload.set('rateioId',ownRateio().id);deniedUpload.set('valor','1.00');deniedUpload.set('comprovante',new Blob([new Uint8Array(5*1024*1024+1)]),'grande.pdf')
      assert.equal((await request('POST','/api/pagamentos',morador.token,deniedUpload,randomUUID())).status,401)
      assert.deepEqual(await readdir(directory),filesBefore)
      assert.equal((await request('POST','/api/auth/login',undefined,{email:morador.usuario.email,senha})).status,401)
      const deleted = await db.usuario.findUniqueOrThrow({where:{id:morador.usuario.id}})
      assert.equal(deleted.ativo,false)
      assert.ok(deleted.excluidoEm)
      assert.ok(await db.pagamento.findUnique({where:{id:paymentWithFile}}))
      assert.ok(await db.comprovante.findUnique({where:{pagamentoId:paymentWithFile}}))
      assert.equal((await fetch(`${base}/api/pagamentos/${paymentWithFile}/comprovante`,{headers:{Authorization:`Bearer ${master.token}`}})).status,200)
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
    await t.test('seed cria os três perfis, saldo parcial e dívida de ex-moradora sem duplicar ou sobrescrever dados', async () => {
      await assert.rejects(semearDemonstracao(db, senha, 'production'), /produção/)
      await assert.rejects(semearDemonstracao(db, undefined, 'test'))
      const result = await semearDemonstracao(db, senha, 'test')
      assert.equal(result.criado, true)
      const counts = await Promise.all([db.usuario.count(), db.republica.count(), db.membroRepublica.count(), db.despesa.count(), db.pagamento.count(), db.tarefa.count()])
      const stored = await db.usuario.findUniqueOrThrow({ where: { email: 'ana@demo.rephouse.test' } })
      const partial = await db.rateioDespesa.findUniqueOrThrow({ where: { id: demonstracao.rateios.ana } })
      assert.equal(partial.valorPago.toFixed(2), '10.00')
      assert.equal(partial.status, 'PARCIAL')
      assert.equal((await semearDemonstracao(db, 'OutraSenhaDeTeste123!', 'test')).criado, false)
      assert.deepEqual(await Promise.all([db.usuario.count(), db.republica.count(), db.membroRepublica.count(), db.despesa.count(), db.pagamento.count(), db.tarefa.count()]), counts)
      assert.equal((await db.usuario.findUniqueOrThrow({ where: { id: stored.id } })).senhaHash, stored.senhaHash)
      const signed = await request<Session>('POST', '/api/auth/login', undefined, { email: 'carla@demo.rephouse.test', senha })
      assert.equal(signed.status, 200)
      const old = await request<Rateio[]>('GET', '/api/me/financeiro', signed.body.token)
      assert.equal(old.body.find(r => r.id === demonstracao.rateios.carla)?.valorPago, '0.00')
      assert.equal((await request('GET', '/api/master/usuarios', signed.body.token)).status, 403)
      const masterDemo = await request<Session>('POST', '/api/auth/login', undefined, { email: 'master@demo.rephouse.test', senha })
      assert.equal(masterDemo.status, 200)
      assert.equal((await request('GET', '/api/master/dashboard', masterDemo.body.token)).status, 200)
      const scope=`/api/master/republicas/${demonstracao.republicas.aurora}`
      const panel = await request<{totalPendente:string;totalPagoNoMes:string;tarefasAbertas:number;moradoresAtivos:number;proximasContas:{id:string;vencimento:string}[]}>('GET',`${scope}/dashboard`,masterDemo.body.token)
      assert.equal(panel.body.totalPendente,'50.00'); assert.equal(panel.body.totalPagoNoMes,'40.00')
      assert.equal(panel.body.tarefasAbertas,1); assert.equal(panel.body.moradoresAtivos,2)
      assert.deepEqual(panel.body.proximasContas.map(item=>item.id),[demonstracao.despesas.internet])
      const tarefa = await db.tarefa.findUniqueOrThrow({ where: { id: demonstracao.tarefas[0] } })
      await db.tarefa.delete({ where: { id: tarefa.id } })
      await assert.rejects(semearDemonstracao(db, senha, 'test'), /incompleta/)
      assert.equal(await db.tarefa.count(), counts[5] - 1)
      await db.tarefa.create({ data: tarefa })
      const cli = await promisify(execFile)(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'db', 'seed'], {
        env: { ...process.env, DATABASE_URL: isolated.toString(), DEMO_PASSWORD: senha, NODE_ENV: 'test' },
        windowsHide: true,
      })
      assert.match(cli.stdout, /já existe/)
      assert.equal(cli.stdout.includes(senha), false)
      for(let index=0;index<6;index++) {
        const due=new Date(); due.setUTCDate(due.getUTCDate()+365+index)
        assert.equal((await request('POST',`${scope}/despesas`,masterDemo.body.token,{titulo:`Próxima ${index}`,categoria:'OUTROS',valorTotal:'1.00',vencimento:due.toISOString().slice(0,10),membroIds:[demonstracao.membros.adminAurora]})).status,201)
      }
      const upcoming=await request<{proximasContas:{vencimento:string;status:string}[]}>('GET',`${scope}/dashboard`,masterDemo.body.token)
      assert.equal(upcoming.body.proximasContas.length,5)
      assert.ok(upcoming.body.proximasContas.every(item=>item.status==='PENDENTE'))
      const dates=upcoming.body.proximasContas.map(item=>item.vencimento)
      assert.deepEqual(dates,[...dates].sort())
    })
    await t.test('paginação usa totais do contexto, ordenação estável e rejeita consultas inválidas',async()=>{
      for(let index=0;index<5;index++){
        assert.equal((await request('POST','/api/despesas',admin.token,{titulo:`Página ${index}`,categoria:'OUTROS',valorTotal:'10.00',vencimento:'2035-01-01',membroIds:[adminMember.id]})).status,201)
        assert.equal((await request('POST','/api/tarefas',admin.token,{titulo:`Página ${index}`,responsavelId:adminMember.id})).status,201)
      }
      const countExpenses=await db.despesa.count({where:{republicaId:republicA.body.id}})
      const seen:string[]=[]
      for(let page=1;page<=Math.ceil(countExpenses/2);page++){
        const result=await request<Expense[]>('GET',`/api/despesas?pagina=${page}&limite=2`,admin.token)
        assert.equal(result.status,200);assert.equal(result.json.paginacao.totalItens,countExpenses)
        seen.push(...result.body.map(row=>row.id))
      }
      assert.equal(seen.length,countExpenses);assert.equal(new Set(seen).size,countExpenses)
      const again=await request<Expense[]>('GET','/api/despesas?pagina=1&limite=2',admin.token)
      assert.deepEqual(again.body.map(row=>row.id),seen.slice(0,2))
      const beyond=await request('GET','/api/despesas?pagina=999&limite=2',admin.token)
      assert.deepEqual(beyond.json.dados,[]);assert.equal(beyond.json.paginacao.totalItens,countExpenses)
      for(const query of ['pagina=0','pagina=-1','pagina=1.5','pagina=1e2','pagina=','pagina=1000001','limite=0','limite=101','pagina=1&pagina=2','estranho=1'])assert.equal((await request('GET',`/api/despesas?${query}`,admin.token)).status,400)
      const scope=`/api/master/republicas/${republicA.body.id}`
      const lists:[string,string,number][]=[['/api/membros',admin.token,1],['/api/despesas',admin.token,countExpenses],['/api/tarefas',admin.token,5],['/api/me/financeiro',admin.token,countExpenses],['/api/master/usuarios',master.token,await db.usuario.count()],['/api/master/republicas',master.token,await db.republica.count()],[`${scope}/membros`,master.token,1],[`${scope}/despesas`,master.token,countExpenses],[`${scope}/tarefas`,master.token,5]]
      for(const [path,token,total]of lists){
        const result=await request('GET',`${path}?limite=1`,token)
        assert.equal(result.status,200,path);assert.equal(result.json.paginacao.totalItens,total,path)
        assert.equal(result.json.paginacao.limite,1);assert.equal(result.json.dados.length,1)
      }
      assert.equal((await request('GET','/api/membros?inativos=true',admin.token)).json.paginacao.totalItens,2)
    })
    await t.test('pagamento concorrente com edição conserva o histórico ou invalida o rateio antigo',async()=>{
      const created=await request<Expense>('POST','/api/despesas',admin.token,{titulo:'Concorrência',categoria:'OUTROS',valorTotal:'100.00',vencimento:'2035-01-01',membroIds:[adminMember.id]})
      const [paid,edited]=await Promise.all([request('POST','/api/pagamentos',admin.token,{rateioId:created.body.rateios[0]!.id,valor:'40.00'},randomUUID()),request('PATCH',`/api/despesas/${created.body.id}`,admin.token,{valorTotal:'120.00'})])
      assert.ok((paid.status===201&&edited.status===409)||(paid.status===404&&edited.status===200),JSON.stringify([paid,edited]))
      const item=await db.despesa.findUniqueOrThrow({where:{id:created.body.id},include:{rateios:{include:{pagamentos:true}}}})
      assert.equal(item.rateios.length,1)
      assert.equal(item.rateios[0]!.valorDevido.toFixed(2),item.valorTotal.toFixed(2))
      assert.equal(item.rateios[0]!.valorPago.toFixed(2),paid.status===201?'40.00':'0.00')
    })
    await t.test('excluir conta concorrente com nova dívida não deixa usuário excluído devedor',async()=>{
      const user=await register('Concorrência de conta')
      const joined=await request<Member>('POST','/api/republicas/entrar',user.token,{codigoEntrada:republicA.body.codigoEntrada})
      const [deleted,created]=await Promise.all([request('DELETE','/api/me',user.token,{senha}),request('POST','/api/despesas',admin.token,{titulo:'Nova dívida',categoria:'OUTROS',valorTotal:'10.00',vencimento:'2035-01-01',membroIds:[joined.body.id]})])
      assert.ok((deleted.status===204&&[400,409].includes(created.status))||(deleted.status===409&&created.status===201),JSON.stringify([deleted,created]))
      const stored=await db.usuario.findUniqueOrThrow({where:{id:user.usuario.id}})
      if(stored.excluidoEm)assert.equal(await db.rateioDespesa.count({where:{membro:{usuarioId:stored.id}}}),0)
    })
    await t.test('bloqueios concorrentes preservam pelo menos um MASTER ativo',async()=>{
      const second=await register('Segundo Master concorrente')
      await db.usuario.update({where:{id:second.usuario.id},data:{tipoUsuario:'USUARIO_MASTER'}})
      await db.usuario.update({where:{id:demonstracao.contas[0]!.id},data:{ativo:false}})
      assert.equal(await db.usuario.count({where:{tipoUsuario:'USUARIO_MASTER',ativo:true}}),2)
      const results=await Promise.all([request('PATCH',`/api/master/usuarios/${master.usuario.id}/status`,master.token,{ativo:false}),request('PATCH',`/api/master/usuarios/${second.usuario.id}/status`,second.token,{ativo:false})])
      assert.deepEqual(results.map(result=>result.status).sort(),[200,409])
      assert.equal(await db.usuario.count({where:{tipoUsuario:'USUARIO_MASTER',ativo:true}}),1)
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
