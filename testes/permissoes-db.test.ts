import 'dotenv/config'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { once } from 'node:events'
import pg from 'pg'
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose'
import { createGoogleVerifier } from '../codigo/modulos/autenticacao/google.verifier.js'
import { abrirSchemaAuditoria, registros } from './auxiliares/schema.js'
import { validarDestinoTestes } from '../ferramentas/integracao/destino-testes.js'
import { provisionRuntimeRole } from '../codigo/infraestrutura/banco/permissoes.js'
import { createDatabase } from '../codigo/infraestrutura/banco/client.js'
import { createApp } from '../codigo/app.js'
import { validarResposta } from './auxiliares/contrato.js'
import { password as userPassword, secret, type Session, type Schemas, type Member, type Expense } from './auxiliares/request-spec.js'
import { testMailbox } from './auxiliares/email.js'
import { hash, argon2id } from 'argon2'
import { readFile } from 'node:fs/promises'

async function contextoPermissoes(anteriores = false) {
  const c = await abrirSchemaAuditoria(anteriores)
  const role = 'runtime_test_' + randomUUID().replaceAll('-', '')
  const password = randomBytes(32).toString('hex')
  const url = validarDestinoTestes(process.env.TEST_DATABASE_URL)
  url.username = role; url.password = password; url.searchParams.set('schema',c.schema)
  const runtime = new pg.Client({connectionString:url.toString(),options:`-c search_path=${c.schema}`})
  return {...c,role,password,url,runtime,async close(){
    try { await runtime.end() }
    finally {
      try {
        // Somente a role aleatória criada pela própria execução no cluster de testes.
        assert.match(role,/^runtime_test_[a-f0-9]{32}$/)
        if((await c.db.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[role])).rowCount){
          await c.db.query(`DROP OWNED BY "${role}"`)
          await c.db.query(`DROP ROLE "${role}"`)
        }
      } finally {await c.close()}
    }
  }}
}

describe('Conta técnica limitada da API no PostgreSQL real',()=>{
  it('quando usa o controle das criações, então só recebe leitura e inserção, sem alteração ou exclusão', async () => {
    const c = await contextoPermissoes()
    try {
      await provisionRuntimeRole(c.db, { role: c.role, password: c.password, schema: c.schema })
      await c.runtime.connect()
      await c.runtime.query(`INSERT INTO operacoes_criacao(usuario_id,operacao,chave,republica_id,hash_requisicao,despesa_id,resposta)
        VALUES($1,'DESPESA',$2,$3,repeat('a',64),$4::uuid,jsonb_build_object('id',$4::uuid::text))`, [c.ids.admin, randomUUID(), c.ids.casa, c.ids.despesa])
      assert.equal((await c.runtime.query('SELECT count(*)::int n FROM operacoes_criacao')).rows[0].n, 1)
      for (const sql of ['UPDATE operacoes_criacao SET resposta=\'{}\'::jsonb', 'DELETE FROM operacoes_criacao']) {
        await assert.rejects(c.runtime.query(sql), (error: unknown) => !!error && typeof error === 'object' && 'code' in error && error.code === '42501')
      }
    } finally { await c.close() }
  })
  it('quando a API usa sua conta técnica, então lê o domínio e não recebe privilégios administrativos',async()=>{
    const c=await contextoPermissoes()
    try {
      await provisionRuntimeRole(c.db,{role:c.role,password:c.password,schema:c.schema})
      await c.runtime.connect()
      const flags=(await c.runtime.query(`SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user`)).rows[0]
      assert.deepEqual(flags,{rolsuper:false,rolcreatedb:false,rolcreaterole:false,rolreplication:false,rolbypassrls:false})
      assert.equal((await c.runtime.query('SELECT count(*)::int n FROM usuarios')).rows[0].n,2)
      await assert.rejects(c.runtime.query(`ALTER TABLE usuarios ADD COLUMN invasao text`),(error:unknown)=>error instanceof Error&&'code'in error&&error.code==='42501')
    }finally{await c.close()}
  })
  it('quando tenta administrar o banco ou ler o histórico de migrations, então o PostgreSQL nega cada operação',async()=>{
    const c=await contextoPermissoes()
    try{
      await c.db.query('CREATE TABLE _prisma_migrations(id text PRIMARY KEY)')
      await provisionRuntimeRole(c.db,{role:c.role,password:c.password,schema:c.schema});await c.runtime.connect()
      const commands=[
        'SELECT * FROM _prisma_migrations',
        'CREATE TABLE invasao(id int)',
        'CREATE SCHEMA invasao_runtime',
        'ALTER TABLE usuarios DISABLE TRIGGER ALL',
        'DROP TABLE usuarios',
        'TRUNCATE tarefas',
        'ALTER DATABASE rabbu_mvp_test SET default_transaction_isolation=\'read committed\'',
        'CREATE ROLE invasao_runtime',
        'DELETE FROM pagamentos',
        'DELETE FROM comprovantes',
      ]
      for(const query of commands)await assert.rejects(c.runtime.query(query),
        (error:unknown)=>error instanceof Error&&'code'in error&&error.code==='42501',query)
      // A conta administrativa ainda pode executar DDL no schema de sua própria execução.
      await c.db.query('CREATE TABLE prova_migration(id integer)');await c.db.query('ALTER TABLE prova_migration ADD COLUMN versao integer');await c.db.query('DROP TABLE prova_migration')
    }finally{await c.close()}
  })
  it('quando reaplica as permissões, então preserva dados e não reaproveita uma conta administrativa',async()=>{
    const c=await contextoPermissoes()
    try{
      const before=await registros(c.db)
      await provisionRuntimeRole(c.db,{role:c.role,password:c.password,schema:c.schema})
      await provisionRuntimeRole(c.db,{role:c.role,password:c.password,schema:c.schema})
      assert.deepEqual(await registros(c.db),before)
      const owner=(await c.db.query('SELECT current_user name')).rows[0].name as string
      await assert.rejects(provisionRuntimeRole(c.db,{role:owner,password:c.password,schema:c.schema}),/Role preexistente/)
      assert.equal((await c.db.query('SELECT rolsuper FROM pg_roles WHERE rolname=current_user')).rows[0].rolsuper,true)
    }finally{await c.close()}
  })
  for(const anteriores of [true,false])it(`quando a API atende HTTP com permissões limitadas ${anteriores?'antes':'depois'} das nove migrations pendentes, então preserva autenticação, financeiro, tarefas e MASTER`,{timeout:60000},async()=>{
    const c=await contextoPermissoes(anteriores)
    if(anteriores){
      // Incluir as migrations funcionais exigidas pela API atual, mantendo a base sem a auditoria de nove migrations.
      for(const name of ['202611200002_autenticacao_email','202611200003_tarefas_compartilhadas','202611200004_notificacoes','202611210001_notificacoes_gerais','202611220001_recorrencia_data_fim','202611220002_fotos_perfil'])await c.db.query(await readFile(`prisma/migracoes/${name}/migration.sql`,'utf8'))
    }
    const runtimeDb=createDatabase(c.url.toString())
    const clientId='permissoes-test.apps.googleusercontent.com'
    const keys=await generateKeyPair('RS256')
    const verifier=createGoogleVerifier(clientId,createLocalJWKSet({keys:[{...await exportJWK(keys.publicKey),kid:'runtime-test',alg:'RS256'}]}))
    const mailbox = testMailbox()
    const server=createApp({database:runtimeDb,jwtSecret:secret,corsOrigins:['http://localhost:5173'],email:mailbox.options,log:()=>{},google:{clientId,verify:verifier}}).listen(0,'127.0.0.1')
    const listening=once(server,'listening')
    try{
      await provisionRuntimeRole(c.db,{role:c.role,password:c.password,schema:c.schema})
      await listening;const address=server.address();assert.ok(address&&typeof address!=='string')
      const base=`http://127.0.0.1:${address.port}`
      let cookie=''
      async function request<T=unknown>(method:string,path:string,status:number,token?:string,body?:unknown,key?:string){
        const form=body instanceof FormData
        const response=await fetch(base+path,{method,headers:{Origin:'http://localhost:5173',Cookie:cookie,...(token?{Authorization:`Bearer ${token}`} : {}),...(body&&!form?{'Content-Type':'application/json'}:{}),...(key?{'Idempotency-Key':key}:{})},body:body?form?body:JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)})
        cookie=response.headers.get('set-cookie')?.split(';')[0]??cookie
        const text=await response.text();const result=text?JSON.parse(text):undefined
        assert.equal(response.status,status,`${method} ${path}: ${text}`);validarResposta(method,path,status,result);return result as T
      }
      async function register(nome:string,email:string) {
        if (anteriores) {
          // Snapshot anterior ao recurso: preparação direta; login e demais ações continuam HTTP reais.
          await c.db.query('INSERT INTO usuarios(id,nome,email,senha_hash) VALUES($1,$2,$3,$4)',[randomUUID(),nome,email,await hash(userPassword,{type:argon2id})])
          return request<Session>('POST','/api/auth/login',200,undefined,{email,senha:userPassword})
        }
        await request('POST','/api/auth/register',202,undefined,{nome,email,senha:userPassword})
        return request<Session>('POST','/api/auth/email/confirmar',200,undefined,mailbox.proof(email))
      }
      const admin=await register('Administrador de teste','admin.http@runtime.rephouse.test')
      // Somente a obtenção externa de chaves Google é controlada; assinatura, HTTP e banco são reais.
      const challenge=await request<Schemas['DesafioGoogle']>('POST','/api/auth/google/desafio',200,undefined,{finalidade:'login'})
      const credential=await new SignJWT({email:'google@runtime.rephouse.test',email_verified:true,nonce:challenge.nonce,name:'Pessoa Google'})
        .setSubject('google-runtime').setIssuer('https://accounts.google.com').setAudience(clientId)
        .setProtectedHeader({alg:'RS256',kid:'runtime-test'}).setIssuedAt().setExpirationTime('5m').sign(keys.privateKey)
      const google=await request<Session>('POST','/api/auth/google',200,undefined,{credential,desafioId:challenge.desafioId})
      assert.equal((await c.db.query('SELECT senha_hash FROM usuarios WHERE id=$1',[google.usuario.id])).rows[0].senha_hash,null)
      const resident=await register('Morador de teste','morador.http@runtime.rephouse.test')
      const house=await request<Schemas['Republica']>('POST','/api/republicas',201,admin.token,{nome:'Casa de permissões'})
      const member=await request<Member>('POST','/api/republicas/entrar',201,resident.token,{codigoEntrada:house.codigoEntrada})
      await request('GET','/api/me',200,admin.token)
      await request('PATCH','/api/me',200,resident.token,{nome:'Morador atualizado'})
      const expenseInput={titulo:'Conta de permissões',categoria:'Casa',valorTotal:'60.00',vencimento:'2099-01-31',membroIds:[member.id]}
      const creationKey=anteriores?undefined:randomUUID()
      const expense=await request<Expense>('POST','/api/despesas',201,admin.token,expenseInput,creationKey)
      if(creationKey)assert.deepEqual(await request<Expense>('POST','/api/despesas',201,admin.token,expenseInput,creationKey),expense)
      const share=expense.rateios[0]!
      // Edição exercita, antes do primeiro pagamento: UPDATE da parcela no lugar (novo valor),
      // INSERT de participante adicionado e DELETE de participante retirado.
      await request('PATCH',`/api/despesas/${expense.id}`,200,admin.token,{valorTotal:'80.00',membroIds:[member.id]})
      const adminMember=(await request<{dados:Member[]}>('GET','/api/membros',200,admin.token)).dados.find(item=>item.usuarioId===admin.usuario.id)!
      assert.equal((await request<Expense>('PATCH',`/api/despesas/${expense.id}`,200,admin.token,{membroIds:[member.id,adminMember.id]})).rateios.length,2)
      assert.equal((await request<Expense>('PATCH',`/api/despesas/${expense.id}`,200,admin.token,{membroIds:[member.id]})).rateios.length,1)
      const edited=await request<Expense>('GET',`/api/despesas/${expense.id}`,200,admin.token)
      const content=Buffer.from('%PDF-1.4\ncomprovante de permissoes\n%%EOF')
      const data=new FormData();data.set('rateioId',edited.rateios[0]!.id);data.set('valor','25.00');data.set('comprovante',new Blob([content],{type:'application/pdf'}),'comprovante.pdf')
      const key=randomUUID(),payment=await request<Schemas['Pagamento']>('POST','/api/pagamentos',201,resident.token,data,key)
      assert.equal((await request<Schemas['Pagamento']>('POST','/api/pagamentos',201,resident.token,data,key)).id,payment.id)
      const download=await fetch(base+`/api/pagamentos/${payment.id}/comprovante`,{headers:{Authorization:`Bearer ${resident.token}`}})
      assert.equal(download.status,200);assert.deepEqual(Buffer.from(await download.arrayBuffer()),content)
      assert.equal((await request<Schemas['ResumoIndividual']>('GET','/api/me/financeiro/resumo',200,resident.token)).saldoPendente,'55.00')
      const taskInput={titulo:'Varrer a casa',responsavelId:member.id}
      const task=await request<Schemas['Tarefa']>('POST','/api/tarefas',201,admin.token,taskInput,creationKey)
      if(creationKey){
        assert.deepEqual(await request<Schemas['Tarefa']>('POST','/api/tarefas',201,admin.token,taskInput,creationKey),task)
        assert.equal((await c.db.query('SELECT count(*)::int n FROM operacoes_criacao')).rows[0].n,2)
      }
      await request('PATCH',`/api/tarefas/${task.id}`,200,resident.token,{status:'CONCLUIDA'})
      const inbox=await request<{dados:Schemas['Notificacao'][]}>('GET','/api/notificacoes?categoria=TAREFAS',200,resident.token)
      const notice=inbox.dados.find(item=>item.tarefaId===task.id)!
      assert.ok(notice)
      await request('PATCH',`/api/notificacoes/${notice.id}/lida`,204,resident.token,{})
      const privileges=(await c.db.query("SELECT has_table_privilege($1,$2,'DELETE') apagar,has_column_privilege($1,$2,'membro_id','UPDATE') trocar_destinatario,has_column_privilege($1,$2,'lida_em','UPDATE') marcar_lida",[c.role,`${c.schema}.notificacoes`])).rows[0]
      assert.deepEqual(privileges,{apagar:false,trocar_destinatario:false,marcar_lida:true})
      // MASTER é preparado apenas na fixture pelo proprietário do schema.
      const master=await register('MASTER de teste','master.http@runtime.rephouse.test')
      await c.db.query("UPDATE usuarios SET tipo_usuario='USUARIO_MASTER' WHERE id=$1",[master.usuario.id])
      await request('GET','/api/master/usuarios',200,master.token);await request('GET','/api/master/usuarios',403,resident.token)
      await request('PATCH',`/api/master/republicas/${house.id}/status`,200,master.token,{ativa:false})
      await request('PATCH',`/api/master/republicas/${house.id}/status`,200,master.token,{ativa:true})
      await request('GET','/api/dashboard',200,admin.token)
      const future=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date()).slice(0,7);const date=new Date(`${future}-01T00:00:00Z`);date.setUTCMonth(date.getUTCMonth()+1)
      await request('POST','/api/recorrencias',201,admin.token,{titulo:'Conta recorrente futura',categoria:'Casa',valorTotal:'10.00',inicio:date.toISOString().slice(0,7),diaVencimento:31,membroIds:[member.id]},randomUUID())
      const recurring=await request<Schemas['Recorrencia']>('POST','/api/recorrencias',201,admin.token,{titulo:'Conta recorrente atual',categoria:'Casa',valorTotal:'10.00',inicio:future,diaVencimento:31,membroIds:[member.id]},randomUUID())
      assert.equal((await c.db.query("SELECT count(*)::int n FROM competencias_recorrencia WHERE recorrencia_id=$1 AND estado='GERADA' AND despesa_id IS NOT NULL",[recurring.id])).rows[0].n,1)
      await request('POST','/api/republicas/transferir-admin',200,admin.token,{membroId:member.id})
      await request('POST','/api/republicas/sair',204,admin.token,{})
      await request('DELETE','/api/me',204,admin.token,{senha:userPassword})
      await request('POST','/api/auth/logout',204,resident.token,{})
      await request('GET','/api/me',401,resident.token)
      // A parcela do morador foi atualizada no lugar: mesmo id, novo valor.
      assert.equal(share.id,edited.rateios[0]!.id)
      assert.equal(edited.rateios[0]!.valorDevido,'80.00')
      assert.equal((await c.db.query('SELECT count(*)::int n FROM pagamentos WHERE id=$1',[payment.id])).rows[0].n,1)
    }finally{
      server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await runtimeDb.$disconnect();await c.close()
    }
  })
})
