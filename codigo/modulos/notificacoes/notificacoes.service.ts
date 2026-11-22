import { Prisma, type PrismaClient, type Tarefa } from '../../gerado/prisma/client.js'
import { withActor, type Actor } from '../../compartilhado/context.js'
import { AppError } from '../../compartilhado/http/app-error.js'
import { pageResult, type PageInput } from '../../compartilhado/http/pagination.js'
import { executarTransacaoAcid } from '../../infraestrutura/banco/transaction.js'
import { civilDate } from '../../configuracao/time-zone.js'
import { addDays } from '../financeiro/dominio/competencia.js'

export type Categoria = 'TAREFAS' | 'DESPESAS' | 'GERAIS'
export type FiltroCategoria = Categoria | 'TODAS'
export type TipoTarefa = 'TAREFA_CRIADA' | 'TAREFA_ASSUMIDA' | 'TAREFA_REATRIBUIDA' | 'TAREFA_CONCLUIDA' | 'TAREFA_LIBERADA' | 'TAREFA_REABERTA'

/** Sem efeitos externos: evento e destinatários pertencem à transação da tarefa. */
export async function notifyTask(tx: Prisma.TransactionClient, task: Tarefa, atorId: string, tipo: TipoTarefa) {
  const recipients = await tx.membroRepublica.findMany({ where: { republicaId: task.republicaId, ativo: true,
    usuarioId: { not: atorId }, usuario: { ativo: true, excluidoEm: null } }, select: { id: true } })
  await tx.eventoNotificacao.create({ data: { republicaId: task.republicaId, categoria: 'TAREFAS', tipo,
    titulo: task.titulo, atorId, tarefaId: task.id, tarefaVersao: task.versao,
    destinatarios: { create: recipients.map(member => ({ membroId: member.id })) } } })
}

/** Chamado apenas depois de uma transição real do vínculo, na mesma transação. */
export async function notifyMembership(tx: Prisma.TransactionClient, member: {id:string;republicaId:string;usuarioId:string}, atorId:string, tipo:'MEMBRO_ENTROU'|'MEMBRO_SAIU') {
  const recipients = await tx.membroRepublica.findMany({where:{republicaId:member.republicaId,ativo:true,
    usuarioId:{notIn:[atorId,member.usuarioId]},usuario:{ativo:true,excluidoEm:null}},select:{id:true}})
  // A criação da primeira casa não possui outros moradores para avisar.
  if (!recipients.length) return
  const subject = await tx.usuario.findUniqueOrThrow({where:{id:member.usuarioId},select:{nome:true}})
  await tx.eventoNotificacao.create({data:{republicaId:member.republicaId,categoria:'GERAIS',tipo,titulo:subject.nome,
    atorId,membroEventoId:member.id,destinatarios:{create:recipients.map(recipient=>({membroId:recipient.id}))}}})
}

async function memberContext(tx: Prisma.TransactionClient, actor: Actor) {
  return tx.membroRepublica.findFirst({ where: { usuarioId: actor.id, ativo: true, republica: { ativa: true } }, select: { id: true, republicaId: true } })
}

function visibility(memberId: string, today: string) {
  return Prisma.sql`n.membro_id=${memberId}::uuid AND (e.categoria IN ('TAREFAS','GERAIS') OR
    (r.valor_pago<r.valor_devido AND e.vencimento=d.vencimento AND e.vencimento>=${today}::date))`
}
const joins = Prisma.sql`FROM notificacoes n JOIN eventos_notificacao e ON e.id=n.evento_id
  LEFT JOIN rateios_despesa r ON r.id=e.rateio_id LEFT JOIN despesas d ON d.id=r.despesa_id`

export function createNotificationsService(db: PrismaClient) {
  return {
    context: (actor: Actor) => withActor(db, actor, tx => memberContext(tx, actor)),
    revision: (actor: Actor) => withActor(db, actor, async tx => {
      const member = await memberContext(tx, actor)
      if (!member) return null
      const [row] = await tx.$queryRaw<{revision:string}[]>`SELECT md5(coalesce(string_agg(n.id::text||coalesce(n.lida_em::text,''),',' ORDER BY n.id),'')) revision
        ${joins} WHERE ${visibility(member.id,civilDate())}`
      return { republicaId: member.republicaId, revision: row!.revision }
    }),
    list: (actor: Actor, category: FiltroCategoria, page: PageInput) => withActor(db, actor, async tx => {
      const member = await memberContext(tx, actor)
      if (!member) return pageResult([], 0, page)
      const where = Prisma.sql`${visibility(member.id, civilDate())} ${category==='TODAS'?Prisma.empty:Prisma.sql`AND e.categoria=${category}`}`
      const [total] = await tx.$queryRaw<{ total: number }[]>`SELECT count(*)::int total ${joins} WHERE ${where}`
      const rows = await tx.$queryRaw<{ id: string; categoria: Categoria; tipo: string; titulo: string; atorNome: string | null;
        tarefaId: string | null; despesaId: string | null; vencimento: Date | null; lidaEm: Date | null; criadoEm: Date }[]>`
        SELECT n.id,e.categoria,e.tipo,e.titulo,u.nome AS "atorNome",e.tarefa_id AS "tarefaId",d.id AS "despesaId",
          e.vencimento,n.lida_em AS "lidaEm",n.criado_em AS "criadoEm" ${joins}
        LEFT JOIN usuarios u ON u.id=e.ator_id WHERE ${where}
        ORDER BY n.criado_em DESC,n.id DESC OFFSET ${(page.pagina-1)*page.limite} LIMIT ${page.limite}`
      return pageResult(rows, total!.total, page)
    }),
    unread: (actor: Actor) => withActor(db, actor, async tx => {
      const member = await memberContext(tx, actor)
      if (!member) return { tarefas: 0, despesas: 0, gerais: 0, total: 0 }
      const [counts] = await tx.$queryRaw<{ tarefas: number; despesas: number; gerais: number; total: number }[]>`
        SELECT count(*) FILTER(WHERE e.categoria='TAREFAS')::int tarefas,
          count(*) FILTER(WHERE e.categoria='DESPESAS')::int despesas,count(*) FILTER(WHERE e.categoria='GERAIS')::int gerais,count(*)::int total
        ${joins} WHERE ${visibility(member.id, civilDate())} AND n.lida_em IS NULL`
      return counts!
    }),
    read: (actor: Actor, input: { id?: string; categoria?: FiltroCategoria }) => withActor(db, actor, async tx => {
      const member = await memberContext(tx, actor)
      if (!member) { if (input.id) throw new AppError(404, 'NOT_FOUND', 'Notificação não encontrada.'); return }
      const filter = Prisma.sql`${visibility(member.id, civilDate())} ${input.id ? Prisma.sql`AND n.id=${input.id}::uuid` : input.categoria==='TODAS'?Prisma.empty:Prisma.sql`AND e.categoria=${input.categoria}`}`
      const rows = await tx.$queryRaw<{id:string}[]>`SELECT n.id ${joins} WHERE ${filter}`
      if (input.id && !rows.length) throw new AppError(404, 'NOT_FOUND', 'Notificação não encontrada.')
      // Atualiza só o conjunto confirmado nesta transação, sem consumir avisos futuros.
      if (rows.length) await tx.notificacao.updateMany({ where: { id: { in: rows.map(row => row.id) }, lidaEm: null }, data: { lidaEm: new Date() } })
    }),
  }
}

export async function processDueNotifications(db: PrismaClient, today = civilDate(), log: (event: Record<string, unknown>) => void = () => {}) {
  const candidates = await db.$queryRaw<{id:string}[]>`
    SELECT r.id FROM rateios_despesa r JOIN despesas d ON d.id=r.despesa_id
    JOIN membros_republica m ON m.id=r.membro_id JOIN usuarios u ON u.id=m.usuario_id JOIN republicas p ON p.id=d.republica_id
    WHERE r.valor_pago<r.valor_devido AND m.ativo AND u.ativo AND u.excluido_em IS NULL AND p.ativa
      AND d.vencimento BETWEEN ${today}::date AND ${addDays(today,7)}::date
      AND NOT EXISTS(SELECT 1 FROM eventos_notificacao e WHERE e.rateio_id=r.id AND e.vencimento=d.vencimento
        AND e.tipo=CASE WHEN d.vencimento=${today}::date THEN 'DESPESA_VENCE_HOJE' ELSE 'DESPESA_PROXIMA' END)
    ORDER BY d.vencimento,r.id LIMIT 50`
  for (const candidate of candidates) {
    try {
      await executarTransacaoAcid(db, async tx => {
        // Serializa apenas a parcela; múltiplas instâncias não criam o mesmo aviso.
        await tx.$queryRaw`SELECT id FROM rateios_despesa WHERE id=${candidate.id}::uuid FOR UPDATE`
        const share = await tx.rateioDespesa.findUnique({ where: { id: candidate.id }, include: { despesa: { include: { republica: true } }, membro: { include: { usuario: true } } } })
        if (!share || !share.membro.ativo || !share.membro.usuario.ativo || share.membro.usuario.excluidoEm || !share.despesa.republica.ativa || share.valorPago.greaterThanOrEqualTo(share.valorDevido)) return
        const day = share.despesa.vencimento.toISOString().slice(0,10)
        if (day < today || day > addDays(today,7)) return
        const tipo = day === today ? 'DESPESA_VENCE_HOJE' : 'DESPESA_PROXIMA'
        const previous = await tx.eventoNotificacao.findUnique({ where: { rateioId_vencimento_tipo: { rateioId: share.id, vencimento: share.despesa.vencimento, tipo } } })
        if (previous) return
        await tx.eventoNotificacao.create({ data: { republicaId: share.despesa.republicaId, categoria: 'DESPESAS', tipo,
          titulo: share.despesa.titulo, rateioId: share.id, vencimento: share.despesa.vencimento,
          destinatarios: { create: { membroId: share.membroId } } } })
      })
    } catch { log({ event: 'notification_failed', code: 'DUE_NOTIFICATION_FAILED' }) }
  }
}

export function startNotificationsScheduler(db: PrismaClient, log: (event: Record<string, unknown>) => void) {
  let running: Promise<void> | undefined, stopped = false
  const run = () => {
    if (stopped || running) return
    running = processDueNotifications(db, civilDate(), log).catch(() => log({ event: 'notification_failed', code: 'NOTIFICATION_SCAN_FAILED' })).finally(() => { running = undefined })
  }
  const timer = setInterval(run, 60_000); timer.unref(); run()
  return async () => { stopped = true; clearInterval(timer); await running }
}
