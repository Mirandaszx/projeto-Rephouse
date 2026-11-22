import assert from 'node:assert/strict'
import { it } from 'node:test'
import { readFile, readdir } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { SignJWT } from 'jose'
import { abrirSchemaAuditoria, registros } from './auxiliares/schema.js'
import { createDatabase } from '../codigo/infraestrutura/banco/client.js'
import { createApp } from '../codigo/app.js'
import { secret } from './auxiliares/request-spec.js'

it('quando migra a base anterior, então preserva finanças, comprovante e snapshot antigo sem inventar autoria ou avisos',async()=>{
  const c=await abrirSchemaAuditoria(true)
  let db:ReturnType<typeof createDatabase>|undefined
  let server:ReturnType<ReturnType<typeof createApp>['listen']>|undefined
  try{
    const names=(await readdir('prisma/migracoes')).filter(name=>/^\d/.test(name)).sort()
    for(const name of names.filter(name=>name>='202611180001_textos'&&name<'202611200003_tarefas_compartilhadas'))await c.db.query(await readFile(`prisma/migracoes/${name}/migration.sql`,'utf8'))
    const task=(await c.db.query('SELECT * FROM tarefas WHERE id=$1',[c.ids.tarefa])).rows[0]
    const body={titulo:task.titulo,responsavelId:c.ids.membro}
    const snapshot={id:task.id,republicaId:task.republica_id,responsavelId:task.responsavel_id,titulo:task.titulo,descricao:task.descricao,prazo:null,status:task.status,criadaEm:task.criada_em.toISOString()}
    const key=randomUUID(),hash=createHash('sha256').update(JSON.stringify([c.ids.casa,[body.titulo,body.responsavelId,null,null]])).digest('hex')
    await c.db.query("INSERT INTO operacoes_criacao(usuario_id,operacao,chave,republica_id,hash_requisicao,tarefa_id,resposta) VALUES($1,'TAREFA',$2,$3,$4,$5,$6::jsonb)",[c.ids.admin,key,c.ids.casa,hash,c.ids.tarefa,JSON.stringify(snapshot)])
    const before=await registros(c.db)
    for(const name of ['202611200003_tarefas_compartilhadas','202611200004_notificacoes','202611210001_notificacoes_gerais'])await c.db.query(await readFile(`prisma/migracoes/${name}/migration.sql`,'utf8'))
    const after=await registros(c.db)
    for(const table of Object.keys(before)){
      if(table==='tarefas'){
        const projected=(await c.db.query('SELECT to_jsonb(t)-\'criador_id\'-\'versao\' linha FROM tarefas t ORDER BY to_jsonb(t)::text')).rows
        assert.deepEqual(projected,before[table])
      }else assert.deepEqual(after[table],before[table],table)
    }
    assert.equal((await c.db.query('SELECT criador_id FROM tarefas')).rows[0].criador_id,null)
    assert.equal((await c.db.query('SELECT count(*)::int n FROM eventos_notificacao')).rows[0].n,0)
    const url=new URL(process.env.TEST_DATABASE_URL!);url.searchParams.set('schema',c.schema)
    db=createDatabase(url.toString())
    server=createApp({database:db,jwtSecret:secret,log:()=>{}}).listen(0,'127.0.0.1');await once(server,'listening')
    const address=server.address();assert.ok(address&&typeof address!=='string')
    const token=await new SignJWT({ver:0}).setProtectedHeader({alg:'HS256'}).setSubject(c.ids.admin).setIssuer('rephouse').setAudience('rephouse-api').setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(secret))
    const replay=await fetch(`http://127.0.0.1:${address.port}/api/tarefas`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)})
    assert.equal(replay.status,201);assert.deepEqual(await replay.json(),snapshot)
    const downloaded=await fetch(`http://127.0.0.1:${address.port}/api/pagamentos/${c.ids.pagamento}/comprovante`,{headers:{Authorization:`Bearer ${token}`}})
    assert.equal(downloaded.status,200)
    const stored=(await c.db.query('SELECT conteudo FROM comprovantes WHERE pagamento_id=$1',[c.ids.pagamento])).rows[0].conteudo
    assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()),stored)
    assert.equal((await c.db.query('SELECT count(*)::int n FROM eventos_notificacao')).rows[0].n,0)
    // Uma reversão após uso não pode eliminar avisos nem autoria para se tornar possível.
    await c.db.query("INSERT INTO tarefas(republica_id,titulo,criador_id) VALUES($1,'Nova tarefa disponível',$2)",[c.ids.casa,c.ids.admin])
    await assert.rejects(c.db.query(await readFile('prisma/migracoes/202611200003_tarefas_compartilhadas/down.sql','utf8')))
    await c.db.query('ROLLBACK')
    assert.equal((await c.db.query('SELECT count(*)::int n FROM tarefas')).rows[0].n,2)
  }finally{
    if(server){server.closeAllConnections();await new Promise<void>(resolve=>server!.close(()=>resolve()))}
    await db?.$disconnect();await c.close()
  }
})
