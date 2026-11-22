import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { contextoCasa, secret, type Schemas, type Page } from './auxiliares/request-spec.js'
import { civilDate } from '../codigo/configuracao/time-zone.js'
import { addDays } from '../codigo/modulos/financeiro/dominio/competencia.js'
import { processDueNotifications } from '../codigo/modulos/notificacoes/notificacoes.service.js'
import { createNotificationsSignal } from '../codigo/modulos/notificacoes/notificacoes.stream.js'
import { createApp } from '../codigo/app.js'
import { iniciarApiCompilada } from './auxiliares/processo-api.js'

type Task = Schemas['Tarefa']
type Notice = Schemas['Notificacao']
const errorCode = (value: unknown) => (value as {error:{code:string}}).error.code

describe('Tarefas compartilhadas e notificações por HTTP real', () => {
  it('quando um morador cria, então deixa disponível ou assume para si, sem atribuir a outros nem criar despesas', async () => {
    const c = await contextoCasa()
    try {
      const available = await c.request<Task>('POST','/api/tarefas',c.ana.token,{titulo:'Varrer a casa'})
      assert.equal(available.status,201); assert.equal(available.body.responsavelId,null); assert.equal(available.body.criadorId,c.ana.usuario.id)
      assert.equal((await c.request<Task>('POST','/api/tarefas',c.ana.token,{titulo:'Cuidar das plantas',responsavelId:c.anaMember.id})).status,201)
      assert.equal((await c.request('POST','/api/tarefas',c.ana.token,{titulo:'Atribuição indevida',responsavelId:c.brunoMember.id})).status,403)
      assert.equal((await c.request('POST','/api/despesas',c.ana.token,{titulo:'Indevida',categoria:'Casa',valorTotal:'10.00',vencimento:'2099-01-01',membroIds:[c.anaMember.id]})).status,403)
      assert.equal(await c.db.tarefa.count(),2)
      assert.equal(await c.db.eventoNotificacao.count({where:{categoria:'TAREFAS'}}),2)
      assert.equal(await c.db.notificacao.count({where:{evento:{categoria:'TAREFAS'},membroId:c.anaMember.id}}),0)
      assert.equal(await c.db.notificacao.count({where:{evento:{categoria:'TAREFAS'},membroId:c.brunoMember.id}}),2)
    } finally { await c.close() }
  })
  it('quando duas pessoas assumem simultaneamente, então só uma vence e a repetição não duplica evento', async () => {
    const c = await contextoCasa()
    try {
      const created=await c.request<Task>('POST','/api/tarefas',c.admin.token,{titulo:'Varrer a casa'})
      const path=`/api/tarefas/${created.body.id}/assumir`
      const results=await Promise.all([c.request<Task>('POST',path,c.ana.token,{}),c.request<Task>('POST',path,c.bruno.token,{})])
      assert.deepEqual(results.map(r=>r.status).sort(),[200,409]); assert.equal(errorCode(results.find(r=>r.status===409)!.body),'TASK_ALREADY_ASSIGNED')
      const winner=results[0]!.status===200?c.ana:c.bruno
      const saved=await c.db.tarefa.findUniqueOrThrow({where:{id:created.body.id}})
      assert.equal(saved.responsavelId,results.find(r=>r.status===200)!.body.responsavelId)
      assert.equal((await c.request('POST',path,winner.token,{})).status,200)
      assert.equal(await c.db.eventoNotificacao.count({where:{tipo:'TAREFA_ASSUMIDA'}}),1)
      assert.equal((await c.request('GET',`/api/tarefas/${saved.id}`,c.other.token)).status,404)
    } finally { await c.close() }
  })
  it('quando cria com chave repetida em paralelo, então preserva resposta e destinatários, permitindo outra criação intencional', async () => {
    const c=await contextoCasa()
    try{
      const key=randomUUID(),body={titulo:'Varrer a casa'}
      const results=await Promise.all([c.request<Task>('POST','/api/tarefas',c.ana.token,body,key),c.request<Task>('POST','/api/tarefas',c.ana.token,body,key)])
      assert.deepEqual(results.map(r=>r.status),[201,201]);assert.deepEqual(results[0]!.body,results[1]!.body)
      assert.equal(await c.db.tarefa.count(),1);assert.equal(await c.db.eventoNotificacao.count({where:{categoria:'TAREFAS'}}),1);assert.equal(await c.db.notificacao.count({where:{evento:{categoria:'TAREFAS'}}}),2)
      assert.equal((await c.request('POST','/api/tarefas',c.ana.token,{titulo:'Outra'},key)).status,409)
      assert.equal((await c.request('POST','/api/tarefas',c.ana.token,body,randomUUID())).status,201)
      assert.equal(await c.db.tarefa.count(),2)
    }finally{await c.close()}
  })
  it('quando edita, conclui, reabre ou libera, então aplica a matriz de permissões e registra somente transições reais', async () => {
    const c=await contextoCasa()
    try{
      const task=(await c.request<Task>('POST','/api/tarefas',c.ana.token,{titulo:'Original'})).body
      const path=`/api/tarefas/${task.id}`
      assert.equal((await c.request('PATCH',path,c.bruno.token,{titulo:'Indevido'})).status,403)
      assert.equal((await c.request('PATCH',path,c.ana.token,{titulo:'Título atualizado',prazo:'2099-02-28'})).status,200)
      assert.equal((await c.request('PATCH',path,c.admin.token,{status:'CONCLUIDA'})).status,409)
      assert.equal((await c.request('POST',path+'/assumir',c.bruno.token,{})).status,200)
      assert.equal((await c.request('PATCH',path,c.ana.token,{titulo:'Não mais disponível'})).status,403)
      assert.equal((await c.request('PATCH',path,c.bruno.token,{titulo:'Indevido'})).status,403)
      assert.equal((await c.request('PATCH',path,c.ana.token,{status:'CONCLUIDA'})).status,403)
      for(let i=0;i<2;i++)assert.equal((await c.request('PATCH',path,c.bruno.token,{status:'CONCLUIDA'})).status,200)
      assert.equal(await c.db.eventoNotificacao.count({where:{tipo:'TAREFA_CONCLUIDA'}}),1)
      assert.equal((await c.request('POST',path+'/liberar',c.bruno.token,{})).status,409)
      const reopened=await c.request<Task>('PATCH',path,c.bruno.token,{status:'ABERTA'})
      assert.equal(reopened.status,200);assert.equal(reopened.body.responsavelId,c.brunoMember.id)
      assert.equal((await c.request('POST',path+'/liberar',c.bruno.token,{})).status,200)
      assert.equal((await c.request<Task>('GET',path,c.ana.token)).body.responsavelId,null)
      assert.equal(await c.db.eventoNotificacao.count({where:{tipo:'TAREFA_LIBERADA'}}),1)
      assert.equal(await c.db.eventoNotificacao.count({where:{tipo:'TAREFA_REABERTA'}}),1)
    }finally{await c.close()}
  })
  it('quando o responsável fica inativo e a administração muda, então mantém o histórico e exige o administrador atual para redistribuir',async()=>{
    const c=await contextoCasa()
    try{
      const task=(await c.request<Task>('POST','/api/tarefas',c.admin.token,{titulo:'Pendente',responsavelId:c.brunoMember.id})).body
      await c.request('PATCH',`/api/membros/${c.brunoMember.id}`,c.admin.token,{ativo:false})
      const current=await c.request<Task>('GET',`/api/tarefas/${task.id}`,c.ana.token)
      assert.equal(current.body.responsavelId,c.brunoMember.id);assert.equal(current.body.responsavelAtivo,false)
      assert.equal((await c.request('POST',`/api/tarefas/${task.id}/assumir`,c.ana.token,{})).status,409)
      assert.equal((await c.request('POST','/api/republicas/transferir-admin',c.admin.token,{membroId:c.anaMember.id})).status,200)
      assert.equal((await c.request('PATCH',`/api/tarefas/${task.id}`,c.admin.token,{responsavelId:c.own.id})).status,403)
      assert.equal((await c.request('PATCH',`/api/tarefas/${task.id}`,c.ana.token,{responsavelId:c.own.id})).status,200)
      assert.equal((await c.request('PATCH',`/api/tarefas/${task.id}`,c.bruno.token,{status:'CONCLUIDA'})).status,409)
    }finally{await c.close()}
  })
  it('quando lê avisos, então abrir não consome, marcar é individual e a paginação permanece no adaptador',async()=>{
    const c=await contextoCasa()
    try{
      await c.request('POST','/api/tarefas',c.admin.token,{titulo:'Primeira'})
      await c.request('POST','/api/tarefas',c.admin.token,{titulo:'Segunda'})
      const list=await c.request<Page<Notice>>('GET','/api/front/v1/notificacoes?categoria=TAREFAS&limite=1',c.ana.token)
      assert.equal(list.status,200);assert.equal(list.body.dados.length,1);assert.equal(list.body.paginacao.totalItens,2)
      const unread=await c.request<Schemas['NotificacoesNaoLidas']>('GET','/api/notificacoes/nao-lidas',c.ana.token)
      assert.equal(unread.body.tarefas,2)
      const id=list.body.dados[0]!.id
      assert.equal((await c.request('PATCH',`/api/notificacoes/${id}/lida`,c.bruno.token,{})).status,404)
      for(let i=0;i<2;i++)assert.equal((await c.request('PATCH',`/api/notificacoes/${id}/lida`,c.ana.token,{})).status,204)
      assert.equal((await c.request<Schemas['NotificacoesNaoLidas']>('GET','/api/notificacoes/nao-lidas',c.ana.token)).body.tarefas,1)
      assert.equal((await c.request<Schemas['NotificacoesNaoLidas']>('GET','/api/notificacoes/nao-lidas',c.bruno.token)).body.tarefas,2)
      assert.equal((await c.request('PATCH','/api/notificacoes/lidas',c.ana.token,{categoria:'TAREFAS'})).status,204)
      assert.deepEqual((await c.request<Schemas['NotificacoesNaoLidas']>('GET','/api/notificacoes/nao-lidas',c.ana.token)).body,{tarefas:0,despesas:0,gerais:1,total:1})
      assert.equal((await c.request('GET','/api/notificacoes?pagina=0',c.ana.token)).status,400)
      assert.equal((await c.request<Page<Notice>>('GET','/api/notificacoes?pagina=99',c.ana.token)).body.dados.length,0)
    }finally{await c.close()}
  })
  it('quando entra depois ou troca de casa, então não recebe retroativos nem consulta avisos da república anterior',async()=>{
    const c=await contextoCasa()
    try{
      await c.request('POST','/api/tarefas',c.admin.token,{titulo:'Anterior à entrada'})
      const late=await c.account('carla');await c.join(late,c.house.codigoEntrada)
      assert.equal((await c.request<Page<Notice>>('GET','/api/notificacoes',late.token)).body.paginacao.totalItens,0)
      const old=(await c.request<Page<Notice>>('GET','/api/notificacoes',c.ana.token)).body.dados[0]!
      assert.equal((await c.request('POST','/api/republicas/sair',c.ana.token,{})).status,204)
      await c.join(c.ana,c.otherHouse.codigoEntrada)
      assert.equal((await c.request<Page<Notice>>('GET','/api/notificacoes',c.ana.token)).body.paginacao.totalItens,0)
      assert.equal((await c.request('PATCH',`/api/notificacoes/${old.id}/lida`,c.ana.token,{})).status,404)
      assert.ok(await c.db.notificacao.findUnique({where:{id:old.id}}))
    }finally{await c.close()}
  })
  it('quando PostgreSQL rejeita o evento, então reverte tarefa, idempotência e destinatários juntos',async()=>{
    const c=await contextoCasa()
    try{
      await c.db.$executeRawUnsafe("ALTER TABLE eventos_notificacao ADD CONSTRAINT falha_controlada CHECK(tipo<>'TAREFA_CRIADA')")
      const result=await c.request('POST','/api/tarefas',c.ana.token,{titulo:'Rollback'},randomUUID())
      assert.equal(result.status,400)
      assert.equal(await c.db.tarefa.count(),0);assert.equal(await c.db.operacaoCriacao.count(),0);assert.equal(await c.db.notificacao.count({where:{evento:{categoria:'TAREFAS'}}}),0)
    }finally{await c.close()}
  })
  it('quando gera lembretes em paralelo, então avisa só o devedor, sem duplicar e sem manter alerta quitado',async()=>{
    const c=await contextoCasa()
    try{
      const today=civilDate(),future=addDays(today,7)
      const expense=await c.expense(c.admin,[c.anaMember.id,c.brunoMember.id],{vencimento:future})
      const anaShare=expense.rateios.find(r=>r.membroId===c.anaMember.id)!
      const brunoShare=expense.rateios.find(r=>r.membroId===c.brunoMember.id)!
      await c.request('POST','/api/pagamentos',c.bruno.token,{rateioId:brunoShare.id,valor:'50.00'},randomUUID())
      await c.request('POST','/api/pagamentos',c.ana.token,{rateioId:anaShare.id,valor:'20.00'},randomUUID())
      await Promise.all([processDueNotifications(c.db,today),processDueNotifications(c.db,today)])
      assert.equal(await c.db.eventoNotificacao.count({where:{categoria:'DESPESAS'}}),1)
      const list=await c.request<Page<Notice>>('GET','/api/notificacoes?categoria=DESPESAS',c.ana.token)
      assert.equal(list.body.paginacao.totalItens,1);assert.equal(list.body.dados[0]!.tipo,'DESPESA_PROXIMA')
      assert.equal((await c.request<Page<Notice>>('GET','/api/notificacoes?categoria=DESPESAS',c.bruno.token)).body.paginacao.totalItens,0)
      await c.request('PATCH','/api/notificacoes/lidas',c.ana.token,{categoria:'TAREFAS'})
      assert.equal((await c.request<Schemas['NotificacoesNaoLidas']>('GET','/api/notificacoes/nao-lidas',c.ana.token)).body.despesas,1)
      await c.request('POST','/api/pagamentos',c.ana.token,{rateioId:anaShare.id,valor:'30.00'},randomUUID())
      assert.equal((await c.request<Page<Notice>>('GET','/api/notificacoes?categoria=DESPESAS',c.ana.token)).body.paginacao.totalItens,0)
      assert.equal(await c.db.eventoNotificacao.count({where:{categoria:'DESPESAS'}}),1)
    }finally{await c.close()}
  })
  it('quando vence hoje ou muda de data, então gera só o aviso devido e invalida a data anterior',async()=>{
    const c=await contextoCasa()
    try{
      const today=civilDate()
      const expense=await c.expense(c.admin,[c.anaMember.id],{vencimento:today})
      await processDueNotifications(c.db,today)
      assert.equal(await c.db.eventoNotificacao.count({where:{tipo:'DESPESA_PROXIMA'}}),0)
      assert.equal(await c.db.eventoNotificacao.count({where:{tipo:'DESPESA_VENCE_HOJE'}}),1)
      await c.request('PATCH',`/api/despesas/${expense.id}`,c.admin.token,{vencimento:addDays(today,20)})
      assert.equal((await c.request<Page<Notice>>('GET','/api/notificacoes?categoria=DESPESAS',c.ana.token)).body.paginacao.totalItens,0)
      await processDueNotifications(c.db,today)
      assert.equal(await c.db.eventoNotificacao.count({where:{categoria:'DESPESAS'}}),1)
    }finally{await c.close()}
  })
  it('quando conecta dois servidores, então SSE transmite só mudanças próprias e sincroniza leitura entre abas',async()=>{
    const c=await contextoCasa()
    const url=new URL(process.env.TEST_DATABASE_URL!);url.searchParams.set('schema',c.schema)
    const signals=[createNotificationsSignal(url.toString(),()=>{}),createNotificationsSignal(url.toString(),()=>{})]
    const apps=signals.map(signal=>createApp({database:c.db,jwtSecret:secret,notificationsSignal:signal}))
    const servers=apps.map(app=>app.listen(0,'127.0.0.1'))
    await Promise.all(servers.map(server=>once(server,'listening')))
    const abort=new AbortController()
    const open=async(index:number)=>{
      const address=servers[index]!.address();assert.ok(address&&typeof address!=='string')
      const response=await fetch(`http://127.0.0.1:${address.port}/api/notificacoes/eventos`,{headers:{Authorization:`Bearer ${c.ana.token}`},signal:abort.signal})
      assert.equal(response.status,200);assert.match(response.headers.get('content-type')??'',/text\/event-stream/)
      const reader=response.body!.getReader();const initial=await reader.read();assert.match(new TextDecoder().decode(initial.value),/event: conectado/)
      return reader
    }
    try{
      const readers=await Promise.all([open(0),open(1)])
      const waits=readers.map(async reader=>{let text='';while(!text.includes('event: atualizar')){const result=await reader.read();if(result.done)throw new Error('Stream ended');text+=new TextDecoder().decode(result.value)}return text})
      const carla=await c.account('carla');await c.join(carla,c.otherHouse.codigoEntrada)
      assert.equal((await c.request('POST','/api/tarefas',c.other.token,{titulo:'Aviso exclusivo da outra casa'})).status,201)
      assert.equal(await Promise.race([Promise.all(waits).then(()=>true),new Promise<boolean>(resolve=>setTimeout(()=>resolve(false),200))]),false,'Eventos da outra casa não invalidam a caixa deste usuário')
      await c.request('POST','/api/tarefas',c.admin.token,{titulo:'Evento em duas instâncias'})
      await Promise.race([Promise.all(waits),new Promise((_,reject)=>setTimeout(()=>reject(new Error('SSE timeout')),7000))])
      const notice=(await c.request<Page<Notice>>('GET','/api/notificacoes',c.ana.token)).body.dados[0]!
      const update=readers[0]!.read()
      await c.request('PATCH',`/api/notificacoes/${notice.id}/lida`,c.ana.token,{})
      assert.match(new TextDecoder().decode((await update).value),/event: atualizar/)
      await c.request('POST','/api/auth/logout',c.ana.token,{})
      await c.request('POST','/api/tarefas',c.admin.token,{titulo:'Verificar revogação'})
      let text='';while(!text.includes('sessao-encerrada')){const next=await readers[0]!.read();if(next.done)break;text+=new TextDecoder().decode(next.value)}
      assert.match(text,/sessao-encerrada/)
    }finally{abort.abort();apps.forEach(app=>app.locals.closeNotifications());await Promise.all(signals.map(signal=>signal.close()));await Promise.all(servers.map(server=>new Promise<void>(resolve=>{server.closeAllConnections();server.close(()=>resolve())})));await c.close()}
  })
  it('quando o processo reinicia, então o agendador real gera avisos e não repete os já persistidos',async()=>{
    const c=await contextoCasa()
    try{
      await c.expense(c.admin,[c.anaMember.id],{vencimento:civilDate()})
      for(let turn=0;turn<2;turn++){
        const process=await iniciarApiCompilada(c.schema)
        try{
          for(let attempt=0;attempt<50&&await c.db.eventoNotificacao.count({where:{tipo:'DESPESA_VENCE_HOJE'}})===0;attempt++)await new Promise(resolve=>setTimeout(resolve,100))
          assert.equal(await c.db.eventoNotificacao.count({where:{tipo:'DESPESA_VENCE_HOJE'}}),1)
        }finally{await process.stop()}
      }
      assert.equal(await c.db.notificacao.count({where:{evento:{categoria:'DESPESAS'}}}),1)
    }finally{await c.close()}
  })
})
