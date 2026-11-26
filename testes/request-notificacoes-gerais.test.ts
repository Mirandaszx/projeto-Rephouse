import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { randomUUID } from 'node:crypto'
import { contextoCasa, password, type Schemas, type Page } from './auxiliares/request-spec.js'
import { processDueNotifications } from '../codigo/modulos/notificacoes/notificacoes.service.js'
import { civilDate } from '../codigo/configuracao/time-zone.js'

type Notice = Schemas['Notificacao']
type Counts = Schemas['NotificacoesNaoLidas']
describe('Notificações gerais e filtro Todas por HTTP real', () => {
  it('quando alguém entra, então avisa os outros moradores habilitados sem avisar a própria pessoa ou outra casa', async () => {
    const c=await contextoCasa()
    try {
      const newcomer=await c.account('carla')
      const before=await c.db.eventoNotificacao.count({where:{categoria:'GERAIS'}})
      const member=await c.join(newcomer,c.house.codigoEntrada)
      const event=await c.db.eventoNotificacao.findFirstOrThrow({where:{membroEventoId:member.id,tipo:'MEMBRO_ENTROU'},include:{destinatarios:true}})
      assert.equal(await c.db.eventoNotificacao.count({where:{categoria:'GERAIS'}}),before+1)
      assert.deepEqual(event.destinatarios.map(row=>row.membroId).sort(),[c.own.id,c.anaMember.id,c.brunoMember.id].sort())
      assert.equal((await c.request<Page<Notice>>('GET','/api/notificacoes?categoria=TODAS',newcomer.token)).body.paginacao.totalItens,0)
      assert.equal((await c.request<Page<Notice>>('GET','/api/notificacoes?categoria=GERAIS',c.other.token)).body.paginacao.totalItens,0)
      const list=await c.request<Page<Notice>>('GET','/api/notificacoes?categoria=TODAS',c.ana.token)
      assert.ok(list.body.dados.some(row=>row.tipo==='MEMBRO_ENTROU'&&row.titulo===event.titulo))
      assert.equal(event.titulo,newcomer.usuario.nome)
    } finally {await c.close()}
  })
  it('quando entrada e saída se repetem simultaneamente, então há um evento por transição e a reentrada gera um novo aviso',async()=>{
    const c=await contextoCasa()
    try {
      const person=await c.account('carla'),body={codigoEntrada:c.house.codigoEntrada}
      const entered=await Promise.all([c.request('POST','/api/republicas/entrar',person.token,body),c.request('POST','/api/republicas/entrar',person.token,body)])
      assert.deepEqual(entered.map(row=>row.status).sort(),[201,409])
      const member=await c.db.membroRepublica.findUniqueOrThrow({where:{usuarioId_republicaId:{usuarioId:person.usuario.id,republicaId:c.house.id}}})
      assert.equal(await c.db.eventoNotificacao.count({where:{membroEventoId:member.id,tipo:'MEMBRO_ENTROU'}}),1)
      const left=await Promise.all([c.request('POST','/api/republicas/sair',person.token,{}),c.request('POST','/api/republicas/sair',person.token,{})])
      assert.deepEqual(left.map(row=>row.status).sort(),[204,409])
      assert.equal(await c.db.eventoNotificacao.count({where:{membroEventoId:member.id,tipo:'MEMBRO_SAIU'}}),1)
      assert.equal((await c.join(person,c.house.codigoEntrada)).id,member.id)
      assert.equal(await c.db.eventoNotificacao.count({where:{membroEventoId:member.id,tipo:'MEMBRO_ENTROU'}}),2)
    } finally {await c.close()}
  })
  it('quando troca de casa, então avisa as duas casas e código inválido reverte a saída sem evento',async()=>{
    const c=await contextoCasa()
    try {
      const before=await c.db.eventoNotificacao.count()
      assert.equal((await c.request('POST','/api/republicas/trocar',c.ana.token,{codigoEntrada:'CODIGOINVALIDO'})).status,404)
      assert.equal(await c.db.eventoNotificacao.count(),before)
      assert.equal((await c.db.membroRepublica.findUniqueOrThrow({where:{id:c.anaMember.id}})).ativo,true)
      assert.equal((await c.request('POST','/api/republicas/trocar',c.ana.token,{codigoEntrada:c.otherHouse.codigoEntrada})).status,200)
      const events=await c.db.eventoNotificacao.findMany({where:{categoria:'GERAIS',titulo:c.ana.usuario.nome}})
      assert.ok(events.some(row=>row.republicaId===c.house.id&&row.tipo==='MEMBRO_SAIU'))
      assert.ok(events.some(row=>row.republicaId===c.otherHouse.id&&row.tipo==='MEMBRO_ENTROU'))
      const previous=await c.db.notificacao.findFirstOrThrow({where:{membroId:c.anaMember.id}})
      assert.equal((await c.request('PATCH',`/api/notificacoes/${previous.id}/lida`,c.ana.token,{})).status,404)
    } finally {await c.close()}
  })
  it('quando administrador desativa um vínculo, então avisa os demais e preserva o destinatário inativo fora da caixa',async()=>{
    const c=await contextoCasa()
    try {
      assert.equal((await c.request('PATCH',`/api/membros/${c.brunoMember.id}`,c.ana.token,{ativo:false})).status,403)
      assert.equal((await c.request('PATCH',`/api/membros/${c.brunoMember.id}`,c.admin.token,{ativo:false})).status,200)
      const event=await c.db.eventoNotificacao.findFirstOrThrow({where:{membroEventoId:c.brunoMember.id,tipo:'MEMBRO_SAIU'},include:{destinatarios:true}})
      assert.deepEqual(event.destinatarios.map(row=>row.membroId),[c.anaMember.id])
      assert.deepEqual((await c.request<Counts>('GET','/api/notificacoes/nao-lidas',c.bruno.token)).body,{tarefas:0,despesas:0,gerais:0,total:0})
      assert.equal((await c.request('PATCH',`/api/membros/${c.brunoMember.id}`,c.admin.token,{ativo:false})).status,404)
      assert.equal(await c.db.eventoNotificacao.count({where:{membroEventoId:c.brunoMember.id,tipo:'MEMBRO_SAIU'}}),1)
    } finally {await c.close()}
  })
  it('quando exclui conta sem impedimentos, então encerra o vínculo e avisa os moradores sem expor e-mail',async()=>{
    const c=await contextoCasa()
    try {
      const person=await c.account('carla'),member=await c.join(person,c.house.codigoEntrada)
      assert.equal((await c.request('DELETE','/api/me',person.token,{senha:password})).status,204)
      const event=await c.db.eventoNotificacao.findFirstOrThrow({where:{membroEventoId:member.id,tipo:'MEMBRO_SAIU'}})
      const list=await c.request<Page<Notice>>('GET','/api/notificacoes?categoria=GERAIS',c.ana.token)
      // LGPD (26/11/2026): a conta excluída é anonimizada, então o aviso de saída também deixa de trazer o nome.
      assert.ok(list.body.dados.some(row=>row.titulo==='Ex-morador'&&row.tipo===event.tipo))
      assert.ok(!JSON.stringify(list.body).includes(person.usuario.email))
      assert.ok(!JSON.stringify(list.body).includes(person.usuario.nome))
      assert.equal((await c.request('GET','/api/notificacoes?categoria=TODAS',person.token)).status,401)
    } finally {await c.close()}
  })
  it('quando a gravação do aviso falha, então reverte entrada e saída junto com os destinatários',async()=>{
    const c=await contextoCasa()
    try {
      const person=await c.account('carla'),before=await c.db.eventoNotificacao.count()
      await c.db.$executeRawUnsafe(`ALTER TABLE eventos_notificacao ADD CONSTRAINT falha_entrada CHECK(tipo<>'MEMBRO_ENTROU' OR ator_id<>'${person.usuario.id}'::uuid)`)
      assert.equal((await c.request('POST','/api/republicas/entrar',person.token,{codigoEntrada:c.house.codigoEntrada})).status,400)
      assert.equal(await c.db.membroRepublica.count({where:{usuarioId:person.usuario.id}}),0)
      assert.equal(await c.db.eventoNotificacao.count(),before)
      await c.db.$executeRawUnsafe('ALTER TABLE eventos_notificacao DROP CONSTRAINT falha_entrada')
      await c.db.$executeRawUnsafe("ALTER TABLE eventos_notificacao ADD CONSTRAINT falha_saida CHECK(tipo<>'MEMBRO_SAIU')")
      assert.equal((await c.request('POST','/api/republicas/sair',c.ana.token,{})).status,400)
      assert.equal((await c.db.membroRepublica.findUniqueOrThrow({where:{id:c.anaMember.id}})).ativo,true)
      assert.equal(await c.db.eventoNotificacao.count(),before)
    } finally {await c.close()}
  })
  it('quando usa Todas, então pagina os três tipos, soma contadores e marca somente os próprios avisos',async()=>{
    const c=await contextoCasa()
    try {
      await c.request('POST','/api/tarefas',c.admin.token,{titulo:'Tarefa para Todas'},randomUUID())
      await c.expense(c.admin,[c.anaMember.id],{vencimento:civilDate()})
      await processDueNotifications(c.db)
      const all=await c.request<Page<Notice>>('GET','/api/front/v1/notificacoes?categoria=TODAS&limite=2',c.ana.token)
      assert.equal(all.status,200);assert.equal(all.body.paginacao.totalItens,3);assert.equal(all.body.dados.length,2)
      const counts=(await c.request<Counts>('GET','/api/notificacoes/nao-lidas',c.ana.token)).body
      assert.deepEqual(counts,{tarefas:1,despesas:1,gerais:1,total:3})
      assert.equal((await c.request('PATCH','/api/notificacoes/lidas',c.ana.token,{categoria:'TAREFAS'})).status,204)
      assert.equal((await c.request<Counts>('GET','/api/notificacoes/nao-lidas',c.ana.token)).body.total,2)
      const otherBefore=(await c.request<Counts>('GET','/api/notificacoes/nao-lidas',c.bruno.token)).body
      for(let i=0;i<2;i++)assert.equal((await c.request('PATCH','/api/notificacoes/lidas',c.ana.token,{categoria:'TODAS'})).status,204)
      assert.deepEqual((await c.request<Counts>('GET','/api/notificacoes/nao-lidas',c.ana.token)).body,{tarefas:0,despesas:0,gerais:0,total:0})
      assert.deepEqual((await c.request<Counts>('GET','/api/notificacoes/nao-lidas',c.bruno.token)).body,otherBefore)
    } finally {await c.close()}
  })
})
