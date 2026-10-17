import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import express from 'express'
import { SignJWT } from 'jose'
import { createApp } from '../codigo/app.js'
import { createAuthService } from '../codigo/modulos/autenticacao/auth.service.js'
import type { PrismaClient } from '../codigo/gerado/prisma/client.js'
import { errorHandler } from '../codigo/compartilhado/http/error-handler.js'
import {createUploadLimit} from '../codigo/compartilhado/http/upload-limit.js'
import {createReceiptStore,type ReceiptIO} from '../codigo/infraestrutura/armazenamento/receipts.js'
import {withProjectLock} from '../codigo/comandos/project-lock.js'
import {manifestSchema} from '../codigo/comandos/operacao-docker.js'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

test('erros estruturados de conexão e conflitos esgotados retornam 503, sem depender da mensagem', async () => {
  for(const error of [{code:'ECONNREFUSED',message:'senha privada'}, {cause:{originalCode:'40001'}}, {meta:{driverAdapterError:{cause:{originalCode:'40P01'}}}}]) {
    const app=express();app.get('/',()=>{throw error});app.use(errorHandler)
    const server=app.listen(0,'127.0.0.1');await once(server,'listening')
    try {
      const address=server.address();assert.ok(address&&typeof address!=='string')
      const response=await fetch(`http://127.0.0.1:${address.port}`)
      assert.equal(response.status,503)
      assert.ok(!(await response.text()).includes('senha privada'))
    }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
  }
})
test('falha de escrita remove somente o arquivo criado, fecha o handle e retorna 503',async()=>{
  let closed=false,removed=false
  const io:ReceiptIO={mkdir:async()=>{},open:async()=>({writeFile:async()=>{throw new Error('ENOSPC privado')},sync:async()=>{},close:async()=>{closed=true}}),unlink:async()=>{removed=true}}
  const store=createReceiptStore('armazenamento/teste-virtual',io)
  await assert.rejects(store.save({buffer:Buffer.from('%PDF-1.4\nteste\n%%EOF')} as Express.Multer.File),error=>error instanceof Error&&'statusCode'in error&&error.statusCode===503)
  assert.ok(closed&&removed)
  removed=false
  io.open=async()=>{throw Object.assign(new Error('permissão negada'),{code:'EACCES'})}
  await assert.rejects(store.save({buffer:Buffer.from('%PDF-1.4\nteste\n%%EOF')} as Express.Multer.File))
  assert.equal(removed,false)
})
test('dois backups não entram simultaneamente e a trava é liberada após falha',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'rephouse-lock-'))
  let release!:()=>void
  const wait=new Promise<void>(resolve=>{release=resolve})
  let entered!:()=>void
  const started=new Promise<void>(resolve=>{entered=resolve})
  try{
    const first=withProjectLock('projeto',directory,async()=>{entered();await wait})
    await started
    await assert.rejects(withProjectLock('projeto',directory,async()=>{}),/Já existe uma operação/)
    release();await first
    await assert.rejects(withProjectLock('projeto',directory,async()=>{throw new Error('falha')}),/falha/)
    await withProjectLock('projeto',directory,async()=>{})
  }finally{release();await rm(directory,{recursive:true,force:true})}
})
test('manifesto rejeita caminho extra, hashes inválidos e banco manipulável',()=>{
  const valid={format:1,createdAt:new Date().toISOString(),applicationVersion:'2.0.0',revision:`sha256:${'a'.repeat(64)}`,project:'rephouse-validacao',database:'rabbu_mvp',user:'rephouse',files:{'banco.dump':'a'.repeat(64),'comprovantes.tar.gz':'b'.repeat(64)}}
  assert.ok(manifestSchema.safeParse(valid).success)
  for(const value of [{...valid,database:'x;DROP DATABASE postgres'},{...valid,files:{...valid.files,'../segredo':'a'.repeat(64)}},{...valid,files:{...valid.files,'banco.dump':'invalido'}}])assert.equal(manifestSchema.safeParse(value).success,false)
})
test('terceiro upload recebe 429 e os dois slots são liberados ao terminar',async()=>{
  let release!:()=>void;const wait=new Promise<void>(resolve=>{release=resolve})
  let notify!:()=>void;const started=new Promise<void>(resolve=>{notify=resolve});let entered=0
  const app=express();app.post('/',createUploadLimit(),async(_req,res)=>{if(++entered===2)notify();await wait;res.sendStatus(200)});app.use(errorHandler)
  const server=app.listen(0,'127.0.0.1');await once(server,'listening')
  try{
    const address=server.address();assert.ok(address&&typeof address!=='string')
    const send=()=>fetch(`http://127.0.0.1:${address.port}`,{method:'POST',headers:{'Content-Type':'multipart/form-data; boundary=test'},body:'--test--'})
    const first=send(),second=send();await started
    const third=await send();assert.equal(third.status,429);assert.equal(third.headers.get('retry-after'),'1')
    release();assert.equal((await first).status,200);assert.equal((await second).status,200);assert.equal((await send()).status,200)
  }finally{release();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
test('JWT precisa de exp, iat, sub UUID e versão não negativa',async()=>{
  const secret='segredo-exclusivo-de-testes-robustos-com-32-caracteres'
  const service=createAuthService({} as PrismaClient,secret)
  for(const invalid of [{sub:'invalido',ver:0,iat:1,exp:9999999999},{sub:'11111111-1111-4111-8111-111111111111',ver:-1,iat:1,exp:9999999999},{sub:'11111111-1111-4111-8111-111111111111',ver:0,iat:1}]) {
    const token=await new SignJWT(invalid).setProtectedHeader({alg:'HS256'}).setIssuer('rephouse').setAudience('rephouse-api').sign(new TextEncoder().encode(secret))
    await assert.rejects(service.verifyToken(token))
  }
})
test('HTTP protege conteúdo com headers Helmet',async()=>{
  const server=createApp({log:()=>{}}).listen(0,'127.0.0.1');await once(server,'listening')
  try {
    const address=server.address();assert.ok(address&&typeof address!=='string')
    const response=await fetch(`http://127.0.0.1:${address.port}/api/health`)
    assert.equal(response.headers.get('x-content-type-options'),'nosniff')
    assert.equal(response.headers.get('x-frame-options'),'SAMEORIGIN')
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
