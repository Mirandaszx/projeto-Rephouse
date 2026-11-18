import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { once } from 'node:events'
import { abrirAmbienteIntegracao, emailIntegracao, type contasIntegracao } from '../ferramentas/integracao/ambiente.js'
import { createApp } from '../codigo/app.js'
import { createAuthService } from '../codigo/modulos/autenticacao/auth.service.js'
import { createRepublicasService } from '../codigo/modulos/republicas/republicas.service.js'
import { createRecorrenciasService, processRecurringBatch, type RecurringInput } from '../codigo/modulos/financeiro/recorrencias.service.js'
import { createFinanceiroService } from '../codigo/modulos/financeiro/financeiro.service.js'
import { executarTransacaoAcid } from '../codigo/infraestrutura/banco/transaction.js'
import { civilDate } from '../codigo/configuracao/time-zone.js'
import { nextMonth } from '../codigo/modulos/financeiro/dominio/competencia.js'
import { validarResposta } from './auxiliares/contrato.js'
import type { Actor } from '../codigo/compartilhado/context.js'
import type { components } from '../integracao/api.js'
import type { Page } from '../codigo/compartilhado/http/pagination.js'
type Schemas = components['schemas']

test('financeiro 2.2: recorrências, consultas HTTP, isolamento e histórico com PostgreSQL', { timeout: 90000 }, async t => {
  const password = 'Senha-financeiro-integracao-2026!'
  const env = await abrirAmbienteIntegracao(process.env.TEST_DATABASE_URL, password)
  const secret = 'segredo-exclusivo-da-regressao-financeiro-2026'
  const auth = createAuthService(env.db, secret), republics = createRepublicasService(env.db), finance = createFinanceiroService(env.db)
  const http = createApp({ database: env.db, jwtSecret: secret, log: () => {} }).listen(0, '127.0.0.1')
  try {
    await once(http, 'listening')
    const address = http.address(); assert.ok(address && typeof address !== 'string')
    const base = `http://127.0.0.1:${address.port}/api`
    async function account(name: keyof typeof contasIntegracao) {
      const session = await auth.login({ email: emailIntegracao(name), senha: password })
      return { token: session.token, actor: { id: session.usuario.id, versaoToken: 0 } as Actor }
    }
    const admin = await account('adminAurora'), ana = await account('ana'), bruno = await account('bruno'), other = await account('adminHorizonte'), master = await account('master')
    const house = await republics.create(admin.actor, { nome: 'Financeiro A' })
    const otherHouse = await republics.create(other.actor, { nome: 'Financeiro B' })
    const a = await republics.join(ana.actor, house.codigoEntrada), b = await republics.join(bruno.actor, house.codigoEntrada)
    const owner = await env.db.membroRepublica.findFirstOrThrow({ where: { usuarioId: admin.actor.id, ativo: true } })
    let today = '2032-01-05'
    const service = createRecorrenciasService(env.db, () => today)
    const input: RecurringInput = { titulo: 'Internet recorrente', categoria: 'Internet', valorTotal: '100.00', diaVencimento: 31, inicio: '2032-01', membroIds: [owner.id,a.id,b.id] }
    async function req<T = unknown>(path: string, token: string, method = 'GET', data?: unknown, status = 200, key?: string) {
      const response = await fetch(base + path, { method, headers: { Authorization: `Bearer ${token}`, ...(data ? { 'Content-Type': 'application/json' } : {}), ...(key ? { 'Idempotency-Key': key } : {}) }, body: data ? JSON.stringify(data) : undefined })
      assert.equal(response.status, status, `${method} ${path}: ${await response.clone().text()}`)
      const value = status === 204 ? undefined : await response.json()
      validarResposta(method,'/api'+path,status,value)
      assert.doesNotMatch(JSON.stringify(value) ?? '', /"(?:snapshot|hashRequisicao|conteudo|senhaHash|chaveIdempotencia)"/)
      return value as T
    }
    let recurringId = '', originalExpense = ''
    await t.test('primeira competência fecha centavos, criação concorrente e reenvio são idempotentes', async () => {
      const key = randomUUID()
      const [first, replay] = await Promise.all([service.create(admin.actor,input,key),service.create(admin.actor,{ ...input, membroIds: [...input.membroIds].reverse(), valorTotal: '100.0' },key)])
      assert.equal(first.id,replay.id); recurringId=first.id
      await assert.rejects(service.create(admin.actor,{...input,valorTotal:'101.00'},key), { code:'IDEMPOTENCY_CONFLICT' })
      const occurrence = await env.db.competenciaRecorrencia.findFirstOrThrow({ where:{recorrenciaId:recurringId} })
      originalExpense=occurrence.despesaId!
      const expense=await env.db.despesa.findUniqueOrThrow({where:{id:originalExpense},include:{rateios:true}})
      assert.deepEqual(expense.rateios.map(item=>item.valorDevido.toFixed(2)).sort(),['33.33','33.33','33.34'])
      await Promise.all([processRecurringBatch(env.db,today),processRecurringBatch(env.db,today)])
      assert.equal(await env.db.despesa.count({where:{titulo:input.titulo}}),1)
    })
    await t.test('edição vale no futuro, fevereiro bissexto e concorrência não duplicam',async()=>{
      await service.edit(admin.actor,recurringId,{valorTotal:'120.00'})
      today='2032-02-01'
      await Promise.all([processRecurringBatch(env.db,today),processRecurringBatch(env.db,today)])
      const feb=await env.db.competenciaRecorrencia.findUniqueOrThrow({where:{recorrenciaId_competencia:{recorrenciaId:recurringId,competencia:new Date('2032-02-01Z')}},include:{despesa:{include:{rateios:true}}}})
      assert.equal(feb.despesa!.vencimento.toISOString().slice(0,10),'2032-02-29')
      assert.equal(feb.despesa!.valorTotal.toFixed(2),'120.00')
      assert.ok(feb.despesa!.rateios.every(item=>item.valorDevido.toFixed(2)==='40.00'))
      assert.equal((await env.db.despesa.findUniqueOrThrow({where:{id:originalExpense}})).valorTotal.toFixed(2),'100.00')
      await assert.rejects(env.db.competenciaRecorrencia.update({where:{recorrenciaId_competencia:{recorrenciaId:recurringId,competencia:feb.competencia}},data:{motivo:'ALTERAR'}}))
    })
    await t.test('novos moradores ficam fora; saída pausa sem redistribuir nem apagar',async()=>{
      const carla=await account('carla'); await republics.join(carla.actor,house.codigoEntrada)
      await republics.leave(ana.actor)
      today='2032-03-01';await processRecurringBatch(env.db,today)
      const recurring=await service.detail(admin.actor,recurringId)
      assert.equal(recurring.pausaMotivo,'PARTICIPANTES_INATIVOS')
      assert.equal(await env.db.despesa.count({where:{titulo:input.titulo}}),2)
      await service.edit(admin.actor,recurringId,{membroIds:[owner.id,b.id],ativa:true})
      today='2032-04-01';await processRecurringBatch(env.db,today)
      const april=await env.db.competenciaRecorrencia.findUniqueOrThrow({where:{recorrenciaId_competencia:{recorrenciaId:recurringId,competencia:new Date('2032-04-01Z')}},include:{despesa:{include:{rateios:true}}}})
      assert.equal(april.despesa!.rateios.length,2)
      assert.deepEqual(april.despesa!.rateios.map(item=>item.membroId).sort(),[owner.id,b.id].sort())
    })
    await t.test('interrupção sinaliza meses antigos, revisão não cobra, transferência usa administrador atual',async()=>{
      await republics.transfer(admin.actor,b.id)
      today='2032-06-01'
      await processRecurringBatch(env.db,today)
      let may=await env.db.competenciaRecorrencia.findUniqueOrThrow({where:{recorrenciaId_competencia:{recorrenciaId:recurringId,competencia:new Date('2032-05-01Z')}}})
      assert.equal(may.estado,'PENDENTE_REVISAO');assert.equal(may.despesaId,null)
      await assert.rejects(service.review(admin.actor,recurringId,'2032-05'),{code:'FORBIDDEN'})
      await service.review(bruno.actor,recurringId,'2032-05')
      may=await env.db.competenciaRecorrencia.findUniqueOrThrow({where:{recorrenciaId_competencia:{recorrenciaId:recurringId,competencia:new Date('2032-05-01Z')}}})
      assert.equal(may.estado,'REVISADA')
      await processRecurringBatch(env.db,today)
      const june=await env.db.competenciaRecorrencia.findUniqueOrThrow({where:{recorrenciaId_competencia:{recorrenciaId:recurringId,competencia:new Date('2032-06-01Z')}},include:{despesa:true}})
      assert.equal(june.despesa!.criadaPorId,bruno.actor.id)
      await service.edit(bruno.actor,recurringId,{ativa:false})
      today='2032-07-01';await processRecurringBatch(env.db,today)
      assert.equal(await env.db.competenciaRecorrencia.count({where:{recorrenciaId:recurringId,competencia:new Date('2032-07-01Z')}}),0)
    })
    await t.test('resumo e filtros usam vencimento, parcela própria e pagamentos sem soma duplicada',async()=>{
      const ref=civilDate(), month=ref.slice(0,7)
      const expense=await finance.create(bruno.actor,{titulo:'Conta com parcial',categoria:'Casa',valorTotal:'120.00',vencimento:new Date(ref+'T00:00:00Z'),membroIds:[owner.id,b.id]})
      const own=expense.rateios.find(item=>item.membroId===owner.id)!
      const proof=Buffer.from('%PDF-1.4\ncomprovante de regressao\n%%EOF')
      await finance.pay(admin.actor,{rateioId:own.id,valor:'25.00',chaveIdempotencia:randomUUID(),comprovante:{conteudo:proof,mimeType:'application/pdf',tamanho:proof.length,hashSha256:createHash('sha256').update(proof).digest('hex')}})
      const summary=await req<Schemas['ResumoIndividual']>(`/me/financeiro/resumo?competencia=${month}`,admin.token)
      assert.equal(summary.totalDevido,'60.00');assert.equal(summary.totalPago,'25.00');assert.equal(summary.saldoPendente,'35.00')
      const shares=await req<Page<Schemas['RateioPessoal']>>(`/me/financeiro?competencia=${month}&situacao=PENDENTES&limite=1`,admin.token)
      assert.equal(shares.paginacao.totalItens,1);assert.equal(shares.dados[0]!.valorRestante,'35.00');assert.equal(shares.dados[0]!.situacaoVencimento,'VENCE_HOJE')
      await finance.pay(admin.actor,{rateioId:own.id,valor:'35.00',chaveIdempotencia:randomUUID()})
      const mine=await req<Page<Schemas['Despesa']>>(`/despesas?competencia=${month}&escopo=PESSOAL&situacao=PAGAS`,admin.token)
      assert.equal(mine.dados.length,1)
      assert.equal((await req<Page<unknown>>(`/despesas?competencia=${month}&escopo=CASA&situacao=PAGAS`,admin.token)).dados.length,0)
      assert.equal((await req<Schemas['ResumoIndividual']>(`/me/financeiro/resumo?competencia=${month}`,admin.token)).saldoPendente,'0.00')
      assert.equal((await req<Page<unknown>>(`/me/financeiro?competencia=${month}&pagina=2&limite=1`,admin.token)).dados.length,0)
      assert.equal((await req<unknown[]>(`/front/v1/despesas?competencia=${month}&situacao=PROXIMAS`,admin.token)).length,1)
      for(const suffix of ['competencia=2026-13','situacao=QUALQUER','competencia=2026-1','aleatorio=1']) await req('/despesas?'+suffix,admin.token,'GET',undefined,400)
      const payment=await env.db.pagamento.findFirstOrThrow({where:{rateioId:own.id},orderBy:{dataPagamento:'asc'}})
      const response=await fetch(base+`/pagamentos/${payment.id}/comprovante`,{headers:{Authorization:`Bearer ${admin.token}`}})
      assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),proof)
      const historical=await env.db.rateioDespesa.findFirstOrThrow({where:{despesaId:originalExpense,membroId:owner.id}})
      await finance.pay(admin.actor,{rateioId:historical.id,valor:'10.00',chaveIdempotencia:randomUUID()})
      assert.equal((await req<Schemas['ResumoIndividual']>('/me/financeiro/resumo?competencia=2032-01',admin.token)).totalPago,'10.00')
      await republics.leave(admin.actor)
      assert.equal((await req<Schemas['ResumoIndividual']>(`/me/financeiro/resumo?competencia=${month}`,admin.token)).totalPago,'60.00')
    })
    await t.test('API preserva isolamento, perfis e validação; origem avulsa começa no próximo mês',async()=>{
      const current=civilDate().slice(0,7), start=nextMonth(current)
      const newInput={...input,inicio:start,membroIds:[b.id],valorTotal:'120.00'}
      const key=randomUUID()
      const created=await req<Schemas['Recorrencia']>('/recorrencias',bruno.token,'POST',newInput,201,key)
      assert.equal((await req<Schemas['Recorrencia']>('/recorrencias',bruno.token,'POST',newInput,201,key)).id,created.id)
      await req('/recorrencias',ana.token,'POST',newInput,409,randomUUID())
      await req(`/recorrencias/${created.id}`,other.token,'GET',undefined,404)
      const scoped=await req<Page<unknown>>(`/master/republicas/${house.id}/recorrencias`,master.token)
      assert.ok(scoped.dados.length>=2)
      const foreign=await env.db.membroRepublica.findFirstOrThrow({where:{republicaId:otherHouse.id}})
      await req('/recorrencias',bruno.token,'POST',{...newInput,membroIds:[foreign.id]},400,randomUUID())
      const origin=await finance.create(bruno.actor,{titulo:'Avulsa original',categoria:'Casa',valorTotal:'20.00',vencimento:new Date(current+'-01Z'),membroIds:[b.id]})
      const source=await req<Schemas['Recorrencia']>('/recorrencias',bruno.token,'POST',{...newInput,despesaOrigemId:origin.id},201,randomUUID())
      assert.equal(source.despesaOrigemId,origin.id)
      assert.equal(await env.db.competenciaRecorrencia.count({where:{recorrenciaId:source.id}}),0)
      await req('/recorrencias',bruno.token,'POST',{...newInput,despesaOrigemId:origin.id},409,randomUUID())
    })
    await t.test('banco rejeita configuração cruzada, e falha conjunta reverte despesa e rateios',async()=>{
      const count=await env.db.despesa.count()
      await assert.rejects(executarTransacaoAcid(env.db,async tx=>{
        await tx.despesa.create({data:{republicaId:house.id,criadaPorId:bruno.actor.id,titulo:'Rollback',categoria:'Casa',valorTotal:'10.00',vencimento:new Date('2032-01-01Z')}})
        throw new Error('Falha controlada antes dos rateios')
      }))
      assert.equal(await env.db.despesa.count(),count)
      const config=await env.db.configuracaoRecorrencia.findFirstOrThrow({where:{recorrenciaId:recurringId}})
      await assert.rejects(env.db.configuracaoRecorrencia.update({where:{id:config.id},data:{titulo:'Mudar histórico'}}))
      await assert.rejects(env.db.competenciaRecorrencia.create({data:{recorrenciaId:recurringId,competencia:new Date('2032-08-01Z'),estado:'GERADA',despesaId:originalExpense,configuracaoId:config.id}}))
    })
  } finally { http.closeAllConnections(); await new Promise<void>(done=>http.close(()=>done())); await env.close() }
})
