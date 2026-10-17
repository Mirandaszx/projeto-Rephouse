import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import {once} from 'node:events'
import {readFile} from 'node:fs/promises'
import {SignJWT} from 'jose'
import {createApp} from '../codigo/app.js'
import type {components} from '../integracao/api.js'
import {login,logout,conferir,ErroResposta} from '../integracao/exemplos.js'
import {consultarMinhaConta,listarMoradores,criarTarefa,listarTarefas,concluirTarefa} from '../integracao/jornadas.js'
import {abrirAmbienteIntegracao} from '../ferramentas/integracao/ambiente.js'
import {validarResposta} from './auxiliares/contrato.js'
import {openApiDocument} from '../codigo/openapi.js'

interface Requisicao {_id:string;_type:string;parentId:string;method:string;url:string;headers:{name:string;value:string}[];body:{text?:string};description:string}
type Sessao=components['schemas']['Sessao']
type Republica=components['schemas']['Republica']
type Membro=components['schemas']['Membro']
type Tarefa=components['schemas']['Tarefa']

test('integração: coleção Insomnia e exemplos com API HTTP e PostgreSQL reais',{timeout:90000},async t=>{
  const senha='Senha-ficticia-integracao-123!'
  const secret='segredo-exclusivo-da-integracao-http-com-postgresql'
  // Falhar sem configuração é intencional: esta jornada nunca é aprovada como ignorada.
  const environment=await abrirAmbienteIntegracao(process.env.TEST_DATABASE_URL,senha)
  let unavailable=false
  const server=createApp({database:environment.db,jwtSecret:secret,corsOrigins:['http://localhost:5173'],log:()=>{},readiness:async()=>{
    if(unavailable)throw new Error('falha controlada da dependência')
    return environment.db.$queryRaw`SELECT 1`
  }}).listen(0,'127.0.0.1')
  try{
    await once(server,'listening')
    const address=server.address();assert.ok(address&&typeof address!=='string')
    const base=`http://127.0.0.1:${address.port}`
    const collection=JSON.parse(await readFile('integracao/insomnia-jornadas.json','utf8')) as {__export_format:number;resources:Requisicao[]}
    const requests=collection.resources.filter(resource=>resource._type==='request')
    const vars:Record<string,string>={base_url:base,senha}
    const executed=new Set<string>()
    const render=(text:string)=>text.replace(/\{\{\s*_\.(\w+)\s*\}\}/g,(_match,name:string)=>{
      assert.ok(vars[name],`Variável não preenchida: ${name}`);return vars[name]
    })
    async function request<T=Record<string,unknown>>(id:string,status:number){
      const spec=requests.find(resource=>resource._id===`req_${id}`);assert.ok(spec,`Requisição ausente: ${id}`)
      const url=render(spec.url),path=url.slice(base.length)
      const response=await fetch(url,{method:spec.method,headers:Object.fromEntries(spec.headers.map(header=>[header.name,render(header.value)])),body:spec.body.text?render(spec.body.text):undefined})
      assert.equal(response.status,status,`${id}: HTTP inesperado`)
      assert.match(response.headers.get('X-Request-Id')??'',/^[a-f0-9-]{36}$/)
      assert.equal(response.headers.get('Cache-Control'),'no-store')
      const content=await response.text()
      if(status===204)assert.equal(content,'','204 não possui corpo')
      const body=content?JSON.parse(content):undefined
      validarResposta(spec.method,path,status,body)
      assert.doesNotMatch(JSON.stringify(body)??'',/"(?:senhaHash|senha_hash|versaoToken)"/)
      executed.add(id)
      return body as T
    }
    async function authenticate(role:string){
      const session=await request<Sessao>(`login${role}`,200)
      vars[`token${role}`]=session.token;vars[`usuario${role}Id`]=session.usuario.id
      return session
    }
    await t.test('ambiente recusa ausência de URL, banco da equipe e senha inadequada antes de conectar',async()=>{
      await assert.rejects(abrirAmbienteIntegracao(undefined,senha),/TEST_DATABASE_URL/)
      await assert.rejects(abrirAmbienteIntegracao('postgresql://fixture:fixture@127.0.0.1/banco_projeto',senha),/TEST_DATABASE_URL/)
      await assert.rejects(abrirAmbienteIntegracao(process.env.TEST_DATABASE_URL,'curta'),/DEMO_PASSWORD/)
    })
    await t.test('coleção possui identificadores e rotas válidos, sem operações financeiras',()=>{
      assert.equal(collection.__export_format,4)
      assert.equal(new Set(collection.resources.map(resource=>resource._id)).size,collection.resources.length)
      for(const resource of requests){
        assert.equal(resource.parentId,'__WORKSPACE_ID__')
        const path=resource.url.replace('{{ _.base_url }}','').replace(/\{\{.*?\}\}/g,'ID').split('?')[0]!
        assert.doesNotMatch(path,/pagamentos|financeiro|despesas|dashboard/)
        const actual=path.split('/')
        assert.ok(Object.entries(openApiDocument.paths).some(([template,operations])=>operations[resource.method.toLowerCase()]&&template.split('/').length===actual.length&&template.split('/').every((part,i)=>part.startsWith('{')||part===actual[i])),path)
      }
    })
    await t.test('cadastro, login, perfil e contexto sem república respeitam o contrato',async()=>{
      const registered=await request<Sessao>('cadastro',201)
      vars.tokenNovo=registered.token;vars.usuarioNovoId=registered.usuario.id
      await authenticate('Novo')
      assert.equal((await request<components['schemas']['MinhaConta']>('meNovo',200)).membro,null)
      await request('editarPerfil',200)
      assert.equal((await request<components['schemas']['MinhaConta']>('meNovo',200)).nome,'Novo Nome')
      await request('semRepublica',409)
      const account=await consultarMinhaConta(base,vars.tokenNovo!)
      validarResposta('GET','/api/me',200,account)
      assert.equal(account.nome,'Novo Nome')
      assert.equal((await environment.db.usuario.findUniqueOrThrow({where:{id:registered.usuario.id}})).nome,'Novo Nome')
      for(const house of ['Aurora','Horizonte']){
        await authenticate(`Admin${house}`)
        const republic=await request<Republica>(`criar${house}`,201)
        vars[`republica${house}Id`]=republic.id;vars[`codigo${house}`]=republic.codigoEntrada
        const me=await request<components['schemas']['MinhaConta']>(`meAdmin${house}`,200)
        assert.equal(me.tipoUsuario,'USUARIO_ADMIN');assert.ok(me.membro)
        vars[`membroAdmin${house}Id`]=me.membro.id
      }
      await request('editarRepublica',200)
      assert.equal((await environment.db.republica.findUniqueOrThrow({where:{id:vars.republicaAuroraId}})).endereco,null)
    })
    await t.test('entrada e moradores paginados usam IDs de vínculo e o mesmo escopo',async()=>{
      for(const role of ['Ana','Bruno','Carla','Excluir']){
        await authenticate(role)
        const member=await request<Membro>(`entrar${role}`,201)
        vars[`membro${role}Id`]=member.id
        assert.equal(member.usuarioId,vars[`usuario${role}Id`])
      }
      const members=await listarMoradores(base,vars.tokenAdminAurora!)
      validarResposta('GET','/api/membros',200,members)
      assert.equal(members.paginacao.totalItens,4)
      assert.ok(members.dados.every(member=>member.republicaId===vars.republicaAuroraId&&member.ativo))
      await request('moradores',200);await request('inativosNegado',403)
    })
    await t.test('exemplos de tarefas e coleção conferem autorização, data civil e persistência',async()=>{
      const example=await criarTarefa(base,vars.tokenAdminAurora!,{titulo:'Exemplo tipado',responsavelId:vars.membroAnaId!,prazo:'2030-01-15'})
      validarResposta('POST','/api/tarefas',201,example)
      assert.equal(example.prazo,'2030-01-15T00:00:00.000Z')
      const task=await request<Tarefa>('criarTarefa',201);vars.tarefaId=task.id
      const before=await environment.db.tarefa.count()
      for(const [id,status] of [['concluirOutraPessoa',403],['concluirOutraRepublica',404],['responsavelExterno',400],['normalCriar',403]] as const)await request(id,status)
      assert.equal(await environment.db.tarefa.count(),before)
      assert.equal((await environment.db.tarefa.findUniqueOrThrow({where:{id:task.id}})).status,'ABERTA')
      const result=await concluirTarefa(base,vars.tokenAna!,example.id)
      validarResposta('PATCH',`/api/tarefas/${example.id}`,200,result)
      assert.equal(result.status,'CONCLUIDA')
      await request('concluir',200);await request('normalEditar',403)
      assert.equal((await environment.db.tarefa.findUniqueOrThrow({where:{id:task.id}})).titulo,'Limpar cozinha')
      const tasks=await listarTarefas(base,vars.tokenAna!)
      validarResposta('GET','/api/tarefas',200,tasks);assert.equal(tasks.paginacao.totalItens,2)
      await request('listarTarefas',200)
      await assert.rejects(concluirTarefa(base,vars.tokenCarla!,task.id),error=>error instanceof ErroResposta&&error.status===404&&!!error.requestId)
    })
    await t.test('troca inválida reverte saída; troca, saída e reentrada preservam o vínculo histórico',async()=>{
      await request('trocaInvalida',404)
      assert.equal((await consultarMinhaConta(base,vars.tokenAna!)).membro?.id,vars.membroAnaId)
      await request('trocar',200)
      assert.equal((await request<components['schemas']['MinhaConta']>('meAna',200)).membro?.republicaId,vars.republicaHorizonteId)
      assert.equal((await environment.db.membroRepublica.findUniqueOrThrow({where:{id:vars.membroAnaId}})).ativo,false)
      await request('inativos',200)
      const historic=await listarMoradores(base,vars.tokenAdminAurora!,1,20,true)
      assert.equal(historic.dados.find(member=>member.id===vars.membroAnaId)?.ativo,false)
      await request('sair',204)
      assert.equal((await request<components['schemas']['MinhaConta']>('meAna',200)).membro,null)
      const reentry=await request<Membro>('entrarAna',201);assert.equal(reentry.id,vars.membroAnaId)
      assert.equal((await environment.db.membroRepublica.findUniqueOrThrow({where:{id:reentry.id}})).ativo,true)
    })
    await t.test('transferência atualiza perfis e revoga poderes do administrador anterior sem novo login',async()=>{
      await request('transferir',200)
      assert.equal((await request<components['schemas']['MinhaConta']>('meAdminAurora',200)).tipoUsuario,'USUARIO_NORMAL')
      assert.equal((await request<components['schemas']['MinhaConta']>('meBruno',200)).tipoUsuario,'USUARIO_ADMIN')
      await request('adminAntigo',403)
      assert.equal((await environment.db.republica.findUniqueOrThrow({where:{id:vars.republicaAuroraId}})).adminId,vars.usuarioBrunoId)
      await request('paginaInvalida',400)
      const empty=await request<Awaited<ReturnType<typeof listarMoradores>>>('paginaVazia',200)
      assert.deepEqual(empty.dados,[]);assert.equal(empty.paginacao.totalItens,4)
      for(const value of ['0','-1','1.5','abc','1&pagina=2']){
        const response=await fetch(`${base}/api/membros?pagina=${value}`,{headers:{Authorization:`Bearer ${vars.tokenBruno}`}})
        assert.equal(response.status,400)
        validarResposta('GET','/api/membros',400,await response.json())
      }
    })
    await t.test('MASTER consulta, bloqueia e recupera acesso sem restaurar tokens antigos',async()=>{
      await authenticate('Master')
      await request('masterUsuarios',200);await request('masterRepublicas',200);await request('masterNegado',403)
      const denied=await fetch(`${base}/api/master/usuarios`,{headers:{Authorization:`Bearer ${vars.tokenBruno}`}})
      assert.equal(denied.status,403);validarResposta('GET','/api/master/usuarios',403,await denied.json())
      await request('bloquearRepublica',200);await request('tarefasBloqueadas',403)
      assert.equal((await environment.db.republica.findUniqueOrThrow({where:{id:vars.republicaHorizonteId}})).ativa,false)
      await request('desbloquearRepublica',200);await request('tarefasCarla',200)
      await request('bloquearUsuario',200);await request('sessaoRevogada',401)
      await request('desbloquearUsuario',200);await request('sessaoRevogada',401)
      const session=await login(base,{email:'ana@integracao.rephouse.test',senha});vars.tokenAna=session.token
      validarResposta('POST','/api/auth/login',200,session)
      assert.equal((await consultarMinhaConta(base,vars.tokenAna)).ativo,true)
    })
    await t.test('logout e expiração retornam 401; respostas 204 não são interpretadas como JSON',async()=>{
      await request('logout',204);await request('sessaoRevogada',401)
      await logout(base,vars.tokenNovo!)
      await assert.rejects(consultarMinhaConta(base,vars.tokenNovo!),error=>error instanceof ErroResposta&&error.status===401&&!!error.requestId)
      const user=await environment.db.usuario.findUniqueOrThrow({where:{id:vars.usuarioBrunoId}})
      const expired=await new SignJWT({ver:user.versaoToken}).setProtectedHeader({alg:'HS256'}).setSubject(user.id).setIssuer('rephouse').setAudience('rephouse-api').setIssuedAt(Math.floor(Date.now()/1000)-120).setExpirationTime(Math.floor(Date.now()/1000)-60).sign(new TextEncoder().encode(secret))
      await assert.rejects(consultarMinhaConta(base,expired),error=>error instanceof ErroResposta&&error.status===401)
    })
    await t.test('exclusão lógica preserva usuário e vínculo, revoga sessão e impede reativação',async()=>{
      await request('excluir',204);await request('excluidaMe',401);await request('excluidaLogin',401);await request('excluidaReativar',409)
      const user=await environment.db.usuario.findUniqueOrThrow({where:{id:vars.usuarioExcluirId}})
      assert.equal(user.ativo,false);assert.ok(user.excluidoEm)
      assert.equal((await environment.db.membroRepublica.findUniqueOrThrow({where:{id:vars.membroExcluirId}})).ativo,false)
      assert.equal(await environment.db.despesa.count(),0);assert.equal(await environment.db.pagamento.count(),0)
      assert.deepEqual(requests.map(resource=>resource._id.slice(4)).filter(id=>!executed.has(id)),[],'Toda requisição importável foi exercitada')
    })
    await t.test('CORS, indisponibilidade controlada e limite real de autenticação expõem headers seguros',async()=>{
      const preflight=await fetch(`${base}/api/tarefas`,{method:'OPTIONS',headers:{Origin:'http://localhost:5173','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}})
      assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'http://localhost:5173')
      const allowed=await fetch(`${base}/api/me`,{headers:{Origin:'http://localhost:5173',Authorization:`Bearer ${vars.tokenBruno}`}})
      for(const header of ['X-Request-Id','Retry-After','RateLimit','RateLimit-Policy'])assert.ok(allowed.headers.get('Access-Control-Expose-Headers')?.includes(header))
      const denied=await fetch(`${base}/api/me`,{headers:{Origin:'http://localhost:5173.evil.test',Authorization:`Bearer ${vars.tokenBruno}`}})
      assert.equal(denied.headers.get('Access-Control-Allow-Origin'),null)
      unavailable=true
      const ready=await fetch(`${base}/api/ready`);assert.equal(ready.status,503)
      validarResposta('GET','/api/ready',503,await ready.clone().json())
      await assert.rejects(conferir(ready),error=>error instanceof ErroResposta&&error.status===503&&!!error.requestId)
      unavailable=false
      assert.equal((await fetch(`${base}/api/ready`)).status,200)
      let limited:Response|undefined
      for(let i=0;i<21;i++){
        const response=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'ausente@integracao.rephouse.test',senha})})
        if(response.status===429){limited=response;break}
        assert.equal(response.status,401)
      }
      assert.ok(limited);assert.ok(Number(limited.headers.get('Retry-After'))>0)
      validarResposta('POST','/api/auth/login',429,await limited.clone().json())
      await assert.rejects(conferir(limited),error=>error instanceof ErroResposta&&error.status===429&&!!error.retryAfter&&!!error.requestId)
    })
  }finally{
    server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))
    await environment.close()
  }
})
