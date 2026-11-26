import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { randomUUID } from 'node:crypto'
import { abrirAmbienteIntegracao, emailIntegracao } from '../ferramentas/integracao/ambiente.js'
import { createAuthService } from '../codigo/modulos/autenticacao/auth.service.js'
import { createRepublicasService } from '../codigo/modulos/republicas/republicas.service.js'
import { createRecorrenciasService } from '../codigo/modulos/financeiro/recorrencias.service.js'
import { createFinanceiroService } from '../codigo/modulos/financeiro/financeiro.service.js'
import { civilDate } from '../codigo/configuracao/time-zone.js'
import { monthDate } from '../codigo/modulos/financeiro/dominio/competencia.js'
import { prepareReceipt } from '../codigo/infraestrutura/armazenamento/comprovantes.js'

test('API compilada gera sem visita, encerra e reinicia sem duplicar nem perder comprovante', { timeout: 40000 }, async () => {
  const password='Senha-apenas-do-reinicio-financeiro-2026!'
  const secret='segredo-exclusivo-da-api-compilada-financeiro-2026'
  const env=await abrirAmbienteIntegracao(process.env.TEST_DATABASE_URL,password)
  let child:ChildProcess|undefined
  try {
    const session=await createAuthService(env.db,secret).login({email:emailIntegracao('adminAurora'),senha:password})
    const actor={id:session.usuario.id,versaoToken:0}
    await createRepublicasService(env.db).create(actor,{nome:'Casa reinício financeiro'})
    const member=await env.db.membroRepublica.findFirstOrThrow({where:{usuarioId:actor.id}})
    const today=civilDate(), current=today.slice(0,7), previous=monthDate(current)
    previous.setUTCMonth(previous.getUTCMonth()-1)
    const recurring=await createRecorrenciasService(env.db,()=>previous.toISOString().slice(0,10)).create(actor,
      {titulo:'Geração na inicialização',categoria:'Casa',valorTotal:'100.00',diaVencimento:31,inicio:current,membroIds:[member.id]},randomUUID())
    assert.equal(await env.db.despesa.count(),0)
    const isolated=new URL(process.env.TEST_DATABASE_URL!);isolated.searchParams.set('schema',env.schema)
    async function start() {
      const portProbe=createServer().listen(0,'127.0.0.1');await once(portProbe,'listening')
      const address=portProbe.address();assert.ok(address&&typeof address!=='string')
      const port=address.port;await new Promise<void>(resolve=>portProbe.close(()=>resolve()))
      // IPC existe somente no processo de teste: emite os mesmos sinais do encerramento normal, também no Windows.
      child=spawn(process.execPath,['--input-type=module','-e',"process.once('message', () => { process.disconnect(); process.emit('SIGTERM') }); await import('./dist/server.js')"],{
        env:{...process.env,DATABASE_URL:isolated.toString(),JWT_SECRET:secret,PORT:String(port),HOST:'127.0.0.1',NODE_ENV:'test',APP_TIME_ZONE:'America/Sao_Paulo',CORS_ORIGINS:'',GOOGLE_CLIENT_ID:'',
          // Isola do .env de quem roda os testes, como processo-api.ts: sem envio real de e-mail.
          RESEND_API_KEY:'',BREVO_API_KEY:'',EMAIL_FROM:'',APP_PUBLIC_URL:''},stdio:['ignore','pipe','pipe','ipc'],windowsHide:true,
      })
      let started=false
      child.stdout!.on('data',(chunk:Buffer)=>{if(chunk.toString().includes('"event":"started"'))started=true})
      for(let attempt=0;attempt<100&&!started;attempt++){if(child.exitCode!==null)throw new Error('API compilada encerrou antes de iniciar.');await delay(50)}
      assert.equal(started,true)
      for(let attempt=0;attempt<100;attempt++) {
        if(await env.db.competenciaRecorrencia.count({where:{recorrenciaId:recurring.id,estado:'GERADA'}})===1)return `http://127.0.0.1:${port}`
        await delay(50)
      }
      throw new Error('A competência não foi gerada automaticamente.')
    }
    async function stop() {
      assert.ok(child)
      const exit=once(child,'exit')
      child.send('encerrar')
      const [code]=await exit
      assert.equal(code,0)
      child=undefined
    }
    let base=await start()
    const share=await env.db.rateioDespesa.findFirstOrThrow()
    const bytes=Buffer.from('%PDF-1.4\ncomprovante preservado no reinicio\n%%EOF')
    const receipt=await prepareReceipt(bytes)
    const payment=await createFinanceiroService(env.db).pay(actor,{rateioId:share.id,valor:'25.00',chaveIdempotencia:randomUUID(),comprovante:receipt})
    await stop()
    base=await start()
    assert.equal(await env.db.despesa.count(),1)
    assert.equal((await env.db.rateioDespesa.findUniqueOrThrow({where:{id:share.id}})).valorPago.toFixed(2),'25.00')
    const response=await fetch(`${base}/api/pagamentos/${payment.id}/comprovante`,{headers:{Authorization:`Bearer ${session.token}`}})
    assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes)
    await stop()
  } finally {
    if(child&&child.exitCode===null){child.kill();await once(child,'exit')}
    await env.close()
  }
})
