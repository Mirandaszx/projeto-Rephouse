import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { once } from 'node:events'
import sharp from 'sharp'
import pg from 'pg'
import { abrirRequestSpec, contextoCasa, multipart, password, secret, type Schemas } from './auxiliares/request-spec.js'
import { iniciarApiCompilada } from './auxiliares/processo-api.js'
import { provisionRuntimeRole } from '../codigo/infraestrutura/banco/permissoes.js'
import { createDatabase } from '../codigo/infraestrutura/banco/client.js'
import { createApp } from '../codigo/app.js'
import { validarDestinoTestes } from '../ferramentas/integracao/destino-testes.js'
import { registros } from './auxiliares/schema.js'

const crop = { x: 0, y: 0, largura: 80, altura: 80 }
const image = (color = '#a83928') => sharp({ create: { width: 120, height: 80, channels: 3, background: color } }).png().toBuffer()
function upload(bytes: Uint8Array, area: unknown = crop) {
  const form = new FormData()
  form.set('imagem', new Blob([new Uint8Array(bytes)], { type: 'image/png' }), 'foto.png')
  form.set('recorte', JSON.stringify(area)); return form
}
async function download(base: string, id: string, token?: string, prefix = '/api') {
  const response = await fetch(`${base}${prefix}/usuarios/${id}/foto`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  const bytes = Buffer.from(await response.arrayBuffer())
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.ok(response.headers.get('x-request-id'))
  return { response, bytes }
}

describe('Perfil e foto por HTTP real com PostgreSQL dedicado', () => {
  it('quando salva sem vínculo, então guarda apenas WebP normalizado e o proprietário pode consultar pelo adaptador', async () => {
    const c = await abrirRequestSpec()
    try {
      const user = await c.account('ana')
      const saved = await c.request<Schemas['FotoPerfil']>('POST', '/api/me/foto', user.token, upload(await image()))
      assert.equal(saved.status, 200)
      const own = await c.request<Schemas['MinhaConta']>('GET','/api/me',user.token)
      assert.equal(own.body.foto?.versao, saved.body.versao); assert.equal(own.body.membro, null)
      assert.equal(own.body.emailConfirmadoEm, null)
      const read = await download(c.base, user.usuario.id, user.token, '/api/front/v1')
      assert.equal(read.response.status,200); assert.equal(read.response.headers.get('content-type'),'image/webp')
      const meta = await sharp(read.bytes).metadata()
      assert.equal(meta.width,512); assert.equal(meta.height,512); assert.equal(meta.exif,undefined); assert.equal(meta.xmp,undefined)
      assert.equal(createHash('sha256').update(read.bytes).digest('hex'),saved.body.versao)
      const stored = await c.db.fotoPerfil.findUniqueOrThrow({where:{usuarioId:user.usuario.id}})
      assert.equal(stored.tamanho,read.bytes.length); assert.ok(stored.tamanho <= 524288)
      assert.equal((await download(c.base,user.usuario.id)).response.status,401)
    } finally { await c.close() }
  })
  it('quando consulta outra pessoa, então permite somente a casa atual e não concede exceção a MASTER', async () => {
    const c = await contextoCasa()
    try {
      assert.equal((await c.request('POST','/api/me/foto',c.ana.token,upload(await image()))).status,200)
      assert.equal((await download(c.base,c.ana.usuario.id,c.admin.token)).response.status,200)
      assert.equal((await download(c.base,c.ana.usuario.id,c.other.token)).response.status,404)
      assert.equal((await download(c.base,c.ana.usuario.id,c.master.token)).response.status,404)
      const members = await c.request<{dados:Schemas['MembroListado'][]}>('GET','/api/membros',c.admin.token)
      assert.ok(members.body.dados.find(row=>row.usuarioId===c.ana.usuario.id)?.usuario.foto)
      assert.equal((await c.request('PATCH',`/api/membros/${c.anaMember.id}`,c.admin.token,{ativo:false})).status,200)
      assert.equal((await download(c.base,c.ana.usuario.id,c.admin.token)).response.status,404)
      assert.equal((await download(c.base,c.admin.usuario.id,c.ana.token)).response.status,404)
      assert.equal((await download(c.base,c.ana.usuario.id,c.ana.token)).response.status,200)
      const inactive = await c.request<{dados:Schemas['MembroListado'][]}>('GET','/api/membros?inativos=true',c.admin.token)
      assert.equal(inactive.body.dados.find(row=>row.usuarioId===c.ana.usuario.id)?.usuario.foto,null)
    } finally { await c.close() }
  })
  it('quando o arquivo ou recorte é inválido, então rejeita sem substituir a foto anterior', async () => {
    const c = await abrirRequestSpec()
    try {
      const user = await c.account('ana'), original = await image()
      const first = await c.request<Schemas['FotoPerfil']>('POST','/api/me/foto',user.token,upload(original))
      const frames = Buffer.alloc(80 * 160 * 3,0); frames.fill(255,80 * 80 * 3)
      const animated = await sharp(frames,{raw:{width:80,height:160,channels:3,pageHeight:80}}).webp({loop:0,delay:[100,100]}).toBuffer()
      assert.equal((await sharp(animated,{animated:true}).metadata()).pages,2,'Fixture deve possuir duas páginas')
      const chunks=[animated.subarray(0,12)];let retained=false
      for(let offset=12;offset+8<=animated.length;){const size=animated.readUInt32LE(offset+4),end=offset+8+size+size%2,frame=animated.toString('ascii',offset,offset+4)==='ANMF';if(!frame||!retained)chunks.push(animated.subarray(offset,end));if(frame)retained=true;offset=end}
      const singleFrame=Buffer.concat(chunks);singleFrame.writeUInt32LE(singleFrame.length-8,4)
      await sharp(singleFrame,{animated:true}).png().toBuffer() // Container animado decodificável, ainda que só tenha um frame.
      const excessive = await sharp({create:{width:5001,height:5000,channels:3,background:'white'}}).png().toBuffer()
      for (const [bytes, area] of [
        [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),crop],
        [Buffer.from('GIF89a'),crop], [Buffer.alloc(0),crop], [original.subarray(0,60),crop], [animated,crop], [singleFrame,crop], [excessive,crop],
        [original,{...crop,x:-1}], [original,{...crop,largura:999}], [original,{...crop,altura:70}], [original,{...crop,usuarioId:randomUUID()}],
      ] as const) assert.equal((await c.request('POST','/api/me/foto',user.token,upload(bytes,area))).status,400)
      const large = new Uint8Array(5*1024*1024+1)
      assert.equal((await c.request('POST','/api/me/foto',user.token,upload(large))).status,413)
      assert.equal((await c.db.fotoPerfil.findUniqueOrThrow({where:{usuarioId:user.usuario.id}})).hashSha256,first.body.versao)
    } finally { await c.close() }
  })
  it('quando a foto possui EXIF de orientação e localização, então aplica recorte orientado e remove metadados', async () => {
    const c = await abrirRequestSpec()
    try {
      const user = await c.account('ana')
      const oriented = await sharp(await image()).jpeg().withMetadata({orientation:6}).withExifMerge({IFD0:{Artist:'Pessoa fictícia'},IFD3:{GPSLatitudeRef:'S',GPSLatitude:'23/1 33/1 0/1',GPSLongitudeRef:'W',GPSLongitude:'46/1 38/1 0/1'}}).toBuffer()
      assert.equal((await sharp(oriented).metadata()).orientation,6)
      const ok = await c.request('POST','/api/me/foto',user.token,upload(oriented,{x:0,y:40,largura:80,altura:80}))
      assert.equal(ok.status,200)
      const read = await download(c.base,user.usuario.id,user.token), meta = await sharp(read.bytes).metadata()
      assert.equal(meta.orientation,undefined); assert.equal(meta.exif,undefined)
      assert.equal((await c.request('POST','/api/me/foto',user.token,upload(oriented,{x:40,y:0,largura:80,altura:80}))).status,400)
    } finally { await c.close() }
  })
  it('quando duas substituições são simultâneas, então permanece uma única foto confirmada sem registros órfãos', async () => {
    const c = await abrirRequestSpec()
    try {
      const user=await c.account('ana'), a=await image(), b=await image('#285f9a')
      const responses=await Promise.all([c.request<Schemas['FotoPerfil']>('POST','/api/me/foto',user.token,upload(a)),c.request<Schemas['FotoPerfil']>('POST','/api/me/foto',user.token,upload(b))])
      assert.deepEqual(responses.map(row=>row.status),[200,200])
      assert.equal(await c.db.fotoPerfil.count({where:{usuarioId:user.usuario.id}}),1)
      const stored=await c.db.fotoPerfil.findUniqueOrThrow({where:{usuarioId:user.usuario.id}})
      assert.ok(responses.some(row=>row.body.versao===stored.hashSha256))
      const read=await download(c.base,user.usuario.id,user.token)
      assert.equal(createHash('sha256').update(read.bytes).digest('hex'),stored.hashSha256)
      await assert.rejects(c.db.fotoPerfil.update({where:{usuarioId:user.usuario.id},data:{tamanho:1}}))
      assert.equal((await c.db.fotoPerfil.findUniqueOrThrow({where:{usuarioId:user.usuario.id}})).hashSha256,stored.hashSha256)
    } finally { await c.close() }
  })
  it('quando a conta é bloqueada ou a sessão é revogada, então não permite consultar ou substituir fotos', async () => {
    const c=await contextoCasa()
    try {
      const bytes=await image()
      assert.equal((await c.request('POST','/api/me/foto',c.ana.token,upload(bytes))).status,200)
      assert.equal((await c.request('PATCH',`/api/master/usuarios/${c.ana.usuario.id}/status`,c.master.token,{ativo:false})).status,200)
      assert.equal((await download(c.base,c.ana.usuario.id,c.admin.token)).response.status,404)
      assert.equal((await c.request('POST','/api/me/foto',c.ana.token,upload(bytes))).status,401)
      assert.equal((await c.request('POST','/api/auth/logout',c.bruno.token)).status,204)
      assert.equal((await download(c.base,c.ana.usuario.id,c.bruno.token)).response.status,401)
    } finally { await c.close() }
  })
  it('quando remove ou exclui a conta, então apaga a foto somente após confirmação e preserva exclusões recusadas', async () => {
    const c=await contextoCasa()
    try {
      const bytes=await image()
      assert.equal((await c.request('POST','/api/me/foto',c.admin.token,upload(bytes))).status,200)
      assert.equal((await c.request('DELETE','/api/me',c.admin.token,{senha:password})).status,409)
      assert.equal(await c.db.fotoPerfil.count({where:{usuarioId:c.admin.usuario.id}}),1)
      const person=await c.register()
      const me=await c.request<Schemas['MinhaConta']>('GET','/api/me',person.token)
      assert.ok(me.body.emailConfirmadoEm)
      assert.equal((await c.request('POST','/api/front/v1/me/foto',person.token,upload(bytes))).status,200)
      assert.equal((await c.request('DELETE','/api/me/foto',person.token)).status,204)
      assert.equal((await c.request('DELETE','/api/me/foto',person.token)).status,204)
      assert.equal((await c.request('POST','/api/me/foto',person.token,upload(bytes))).status,200)
      assert.equal((await c.request('DELETE','/api/me',person.token,{senha:password})).status,204)
      assert.equal(await c.db.fotoPerfil.count({where:{usuarioId:person.usuario.id}}),0)
    } finally { await c.close() }
  })
  it('quando reinicia o processo compilado, então a foto continua no PostgreSQL e mantém o mesmo hash',async()=>{
    const c=await abrirRequestSpec()
    let api:Awaited<ReturnType<typeof iniciarApiCompilada>>|undefined
    try {
      const person=await c.account('ana')
      api=await iniciarApiCompilada(c.schema)
      const saved=await fetch(api.base+'/api/me/foto',{method:'POST',headers:{Authorization:`Bearer ${person.token}`},body:upload(await image())})
      assert.equal(saved.status,200);const meta=await saved.json() as Schemas['FotoPerfil']
      await api.stop();api=await iniciarApiCompilada(c.schema)
      const read=await download(api.base,person.usuario.id,person.token)
      assert.equal(read.response.status,200);assert.equal(createHash('sha256').update(read.bytes).digest('hex'),meta.versao)
    } finally {await api?.stop();await c.close()}
  })
  it('quando usa a conta limitada da API, então permite as operações da foto sem privilégios administrativos',async()=>{
    const c=await abrirRequestSpec(),role='runtime_test_'+randomUUID().replaceAll('-',''),rolePassword=randomBytes(32).toString('hex')
    const url=validarDestinoTestes(process.env.TEST_DATABASE_URL);url.searchParams.set('schema',c.schema)
    const admin=new pg.Client({connectionString:url.toString(),options:`-c search_path=${c.schema}`});await admin.connect()
    let runtime:ReturnType<typeof createDatabase>|undefined,server:ReturnType<ReturnType<typeof createApp>['listen']>|undefined
    try {
      const user=await c.account('ana')
      await provisionRuntimeRole(admin,{role,password:rolePassword,schema:c.schema})
      url.username=role;url.password=rolePassword;runtime=createDatabase(url.toString())
      server=createApp({database:runtime,jwtSecret:secret}).listen(0,'127.0.0.1');await once(server,'listening')
      const address=server.address();assert.ok(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`
      const saved=await fetch(base+'/api/me/foto',{method:'POST',headers:{Authorization:`Bearer ${user.token}`},body:upload(await image())})
      assert.equal(saved.status,200);await saved.arrayBuffer()
      assert.equal((await download(base,user.usuario.id,user.token)).response.status,200)
      assert.equal((await fetch(base+'/api/me/foto',{method:'DELETE',headers:{Authorization:`Bearer ${user.token}`}})).status,204)
      assert.equal((await admin.query('SELECT rolsuper FROM pg_roles WHERE rolname=$1',[role])).rows[0].rolsuper,false)
    } finally {
      if(server){server.closeAllConnections();await new Promise<void>(resolve=>server!.close(()=>resolve()))}
      await runtime?.$disconnect();await admin.query(`DROP OWNED BY "${role}"`);await admin.query(`DROP ROLE "${role}"`);await admin.end();await c.close()
    }
  })
  it('quando migra uma base anterior, então preserva seus registros e a reversão recusa apagar fotos',async()=>{
    const c=await contextoCasa(),url=validarDestinoTestes(process.env.TEST_DATABASE_URL);url.searchParams.set('schema',c.schema)
    const sql=new pg.Client({connectionString:url.toString(),options:`-c search_path=${c.schema}`});await sql.connect()
    try {
      const expense=await c.expense(c.admin,[c.own.id,c.anaMember.id])
      const share=expense.rateios.find(row=>row.membroId===c.own.id)!
      assert.equal((await c.request('POST','/api/pagamentos',c.admin.token,multipart(share.id),randomUUID())).status,201)
      const before=await registros(sql)
      const down=await readFile('prisma/migracoes/202611220002_fotos_perfil/down.sql','utf8')
      await sql.query(down)
      await sql.query(await readFile('prisma/migracoes/202611220002_fotos_perfil/migration.sql','utf8'))
      assert.deepEqual(await registros(sql),before)
      assert.equal((await c.request('POST','/api/me/foto',c.ana.token,upload(await image()))).status,200)
      await assert.rejects(sql.query(down));await sql.query('ROLLBACK')
      assert.equal(await c.db.fotoPerfil.count(),1)
      await assert.rejects(sql.query("INSERT INTO fotos_perfil(usuario_id,conteudo,mime_type,tamanho,hash_sha256) VALUES(gen_random_uuid(),decode('01','hex'),'image/webp',1,repeat('a',64))"))
    } finally {await sql.end();await c.close()}
  })
})
