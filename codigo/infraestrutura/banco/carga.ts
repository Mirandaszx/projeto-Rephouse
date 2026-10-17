import {randomBytes} from 'node:crypto'
import {hash,argon2id} from 'argon2'
import {SignJWT} from 'jose'
import type {PrismaClient,TipoUsuario} from '../../gerado/prisma/client.js'
import {dividirIgualmente} from '../../modulos/financeiro/dominio/rateio.js'
import {prepareReceipt} from '../armazenamento/comprovantes.js'
import {receiptFixture} from './comprovante-fixture.js'

export interface LoadActor {token:string;admin:boolean;republicaId:string;despesaId:string;rateioId:string;tarefaId:string;comprovanteId:string}
export async function prepareLoad(db:PrismaClient,profile:string,secret:string){
  if(process.env.NODE_ENV!=='test'||new URL(process.env.DATABASE_URL!).pathname!=='/rabbu_mvp_carga')throw new Error('Carga exige NODE_ENV=test e banco rabbu_mvp_carga isolado.')
  if(await db.usuario.count())throw new Error('O banco de carga deve estar vazio. Não há reset automático.')
  if(!['curto','completo'].includes(profile)||secret.length<32)throw new Error('Configuração de carga inválida.')
  const full=profile==='completo',houses=full?100:10,expensesPerHouse=full?100:10,total=full?1000:100
  let sequence=0
  const id=()=>`ca000000-0000-4000-8000-${String(++sequence).padStart(12,'0')}`
  const senhaHash=await hash(randomBytes(24).toString('hex'),{type:argon2id})
  const users=Array.from({length:total},(_,index)=>({id:id(),nome:`Carga ${index}`,email:`carga-${index}@fixture.example.test`,senhaHash,tipoUsuario:(index===0?'USUARIO_MASTER':'USUARIO_NORMAL') as TipoUsuario}))
  await db.usuario.createMany({data:users})
  let nextUser=1
  const actors:LoadActor[]=[]
  const receipt=await prepareReceipt(receiptFixture())
  for(let house=0;house<houses;house++){
    const residents=users.slice(nextUser,Math.min(nextUser+10,total));nextUser+=residents.length
    const republicaId=id(),admin=residents[0]!
    const members=residents.map(user=>({id:id(),usuarioId:user.id,republicaId}))
    const expenses=Array.from({length:expensesPerHouse},(_,index)=>{
      const due=new Date();due.setUTCDate(10);due.setUTCMonth(due.getUTCMonth()-(index%12));due.setUTCHours(0,0,0,0)
      return {id:id(),republicaId,criadaPorId:admin.id,titulo:`Despesa de carga ${index}`,categoria:'OUTROS',valorTotal:'100.00',vencimento:due}
    })
    const shares=expenses.flatMap(expense=>dividirIgualmente('100.00',members.map(member=>member.id)).map(part=>({id:id(),despesaId:expense.id,...part})))
    const payments=expenses.flatMap((expense,index)=>index%10>=7?[]:shares.filter(share=>share.despesaId===expense.id).map(share=>{
      const cents=Math.round(Number(share.valorDevido)*100)
      const valor=index%10<4?share.valorDevido:(Math.floor(cents/2)/100).toFixed(2)
      return {id:id(),rateioId:share.id,membroId:share.membroId,valor,dataPagamento:new Date(expense.vencimento.getTime()+12*3600000)}
    }))
    const tasks=Array.from({length:20},(_,index)=>({id:id(),republicaId,responsavelId:members[index%members.length]!.id,titulo:`Tarefa ${index}`,status:index<10?'ABERTA' as const:'CONCLUIDA' as const}))
    await db.$transaction(async tx=>{
      await tx.usuario.update({where:{id:admin.id},data:{tipoUsuario:'USUARIO_ADMIN'}})
      await tx.republica.create({data:{id:republicaId,nome:`República de carga ${house}`,codigoEntrada:`CARGA${String(house).padStart(6,'0')}`,adminId:admin.id}})
      await tx.membroRepublica.createMany({data:members})
      await tx.despesa.createMany({data:expenses})
      await tx.rateioDespesa.createMany({data:shares})
      await tx.pagamento.createMany({data:payments})
      await tx.tarefa.createMany({data:tasks})
    },{timeout:60000})
    // Um ator por casa: mistura de ADMIN/NORMAL, sem compartilhar saldo entre VUs.
    const memberIndex=house%5===0?0:1
    const actor=residents[memberIndex]!
    const member=members[memberIndex]!
    const available=expenses[7]!
    const rateio=shares.find(share=>share.despesaId===available.id&&share.membroId===member.id)!
    const download=payments.find(payment=>payment.membroId===member.id)!
    await db.comprovante.create({data:{pagamentoId:download.id,...receipt}})
    const token=await new SignJWT({ver:0}).setProtectedHeader({alg:'HS256'}).setSubject(actor.id).setIssuedAt().setIssuer('rephouse').setAudience('rephouse-api').setExpirationTime('1h').sign(new TextEncoder().encode(secret))
    actors.push({token,admin:memberIndex===0,republicaId,despesaId:available.id,rateioId:rateio.id,tarefaId:tasks[memberIndex]!.id,comprovanteId:download.id})
  }
  return {actors:actors.slice(0,50),profile,expected:{usuarios:total,republicas:houses,despesas:houses*expensesPerHouse,tarefas:houses*20}}
}

export async function loadIntegrity(db:PrismaClient){
  const [financial]=await db.$queryRaw<{saldosInvalidos:number;totaisInvalidos:number;contextosInvalidos:number;chavesDuplicadas:number;statusInvalidos:number;isolation:string;sync:string;fsync:string;fullPageWrites:string}[]>`
    SELECT (SELECT count(*)::int FROM rateios_despesa r WHERE valor_pago<>(SELECT coalesce(sum(valor),0) FROM pagamentos p WHERE p.rateio_id=r.id) OR valor_pago>valor_devido) AS "saldosInvalidos",
    (SELECT count(*)::int FROM despesas d WHERE valor_total<>(SELECT sum(valor_devido) FROM rateios_despesa r WHERE r.despesa_id=d.id)) AS "totaisInvalidos",
    (SELECT count(*)::int FROM rateios_despesa r JOIN despesas d ON d.id=r.despesa_id JOIN membros_republica m ON m.id=r.membro_id WHERE d.republica_id<>m.republica_id) AS "contextosInvalidos",
    (SELECT count(*)::int FROM (SELECT chave_idempotencia FROM pagamentos GROUP BY chave_idempotencia HAVING count(*)>1) x) AS "chavesDuplicadas",
    ((SELECT count(*) FROM rateios_despesa r WHERE r.status::text<>CASE WHEN valor_pago=valor_devido THEN 'PAGO' WHEN valor_pago>0 THEN 'PARCIAL' ELSE 'PENDENTE' END)+(SELECT count(*) FROM despesas d WHERE d.status::text<>CASE WHEN valor_total=(SELECT sum(valor_pago) FROM rateios_despesa r WHERE r.despesa_id=d.id) THEN 'PAGA' ELSE 'PENDENTE' END))::int AS "statusInvalidos",
    current_setting('default_transaction_isolation') AS isolation,current_setting('synchronous_commit') AS sync,current_setting('fsync') AS fsync,current_setting('full_page_writes') AS "fullPageWrites"`
  if(!financial)throw new Error('Não foi possível conferir a integridade da carga.')
  const [storage]=await db.$queryRaw<{comprovantesInvalidos:number;bancoBytes:number}[]>`SELECT (SELECT count(*)::int FROM comprovantes WHERE hash_sha256<>encode(sha256(conteudo),'hex') OR tamanho<>octet_length(conteudo)) AS "comprovantesInvalidos", pg_database_size(current_database())::float8 AS "bancoBytes"`
  return {usuarios:await db.usuario.count(),republicas:await db.republica.count(),despesas:await db.despesa.count(),tarefas:await db.tarefa.count(),rateios:await db.rateioDespesa.count(),pagamentos:await db.pagamento.count(),comprovantes:await db.comprovante.count(),...financial,...storage}
}
