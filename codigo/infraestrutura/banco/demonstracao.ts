import { hash, argon2id } from 'argon2'
import { z } from 'zod'
import type { PrismaClient, TipoUsuario } from '../../gerado/prisma/client.js'
import { executarTransacaoAcid } from './transaction.js'
import { dividirIgualmente } from '../../modulos/financeiro/dominio/rateio.js'
import { civilDate } from '../../configuracao/time-zone.js'

// IDs reservados tornam a execução repetível sem procurar ou sobrescrever dados reais.
const id = (tipo: number, numero: number) => `de000000-0000-4000-8000-${String(tipo).padStart(4, '0')}${String(numero).padStart(8, '0')}`
const contas = [
  { id: id(1, 1), nome: 'Master Demonstração', email: 'master@demo.rephouse.test', tipoUsuario: 'USUARIO_MASTER' },
  { id: id(1, 2), nome: 'Admin Aurora', email: 'admin.aurora@demo.rephouse.test', tipoUsuario: 'USUARIO_ADMIN' },
  { id: id(1, 3), nome: 'Admin Horizonte', email: 'admin.horizonte@demo.rephouse.test', tipoUsuario: 'USUARIO_ADMIN' },
  { id: id(1, 4), nome: 'Ana Moradora', email: 'ana@demo.rephouse.test', tipoUsuario: 'USUARIO_NORMAL' },
  { id: id(1, 5), nome: 'Bruno Morador', email: 'bruno@demo.rephouse.test', tipoUsuario: 'USUARIO_NORMAL' },
  { id: id(1, 6), nome: 'Carla Ex-moradora', email: 'carla@demo.rephouse.test', tipoUsuario: 'USUARIO_NORMAL' },
] satisfies { id: string; nome: string; email: string; tipoUsuario: TipoUsuario }[]

export const demonstracao = {
  contas,
  republicas: { aurora: id(2, 1), horizonte: id(2, 2) },
  codigos: { aurora: 'DEMOAURORA', horizonte: 'DEMOHORIZONTE' },
  membros: { adminAurora: id(3, 1), ana: id(3, 2), carlaAurora: id(3, 3), adminHorizonte: id(3, 4), bruno: id(3, 5), carlaHorizonte: id(3, 6) },
  despesas: { internet: id(4, 1), agua: id(4, 2) },
  rateios: { adminAurora: id(5, 1), ana: id(5, 2), carla: id(5, 3), adminHorizonte: id(5, 4), bruno: id(5, 5) },
  pagamentos: [id(6, 1), id(6, 2), id(6, 3), id(6, 4)],
  tarefas: [id(7, 1), id(7, 2), id(7, 3)],
}

export async function semearDemonstracao(db: PrismaClient, senha: string | undefined, ambiente = process.env.NODE_ENV ?? 'development') {
  if (ambiente === 'production') throw new Error('Dados de demonstração não são permitidos em produção.')
  if (!['development', 'test'].includes(ambiente)) throw new Error('Use ambiente development ou test para criar a demonstração.')
  const password = z.string().min(12).max(128).parse(senha)
  // O hash é compartilhado somente pelas contas fictícias e nunca é recalculado no retry.
  const senhaHash = await hash(password, { type: argon2id })
  const d = demonstracao
  const vencimento = new Date(`${civilDate()}T00:00:00.000Z`)
  vencimento.setUTCDate(vencimento.getUTCDate() + 10)
  return executarTransacaoAcid(db, async tx => {
    const existentes = await Promise.all([
      tx.usuario.count({ where: { id: { in: contas.map(c => c.id) } } }),
      tx.republica.count({ where: { id: { in: Object.values(d.republicas) } } }),
      tx.membroRepublica.count({ where: { id: { in: Object.values(d.membros) } } }),
      tx.despesa.count({ where: { id: { in: Object.values(d.despesas) } } }),
      tx.rateioDespesa.count({ where: { id: { in: Object.values(d.rateios) } } }),
      tx.pagamento.count({ where: { id: { in: d.pagamentos } } }),
      tx.tarefa.count({ where: { id: { in: d.tarefas } } }),
    ])
    if (existentes.some(count => count > 0)) {
      if (existentes.every((count, index) => count === [6, 2, 6, 2, 5, 4, 3][index])) return { criado: false, contas }
      throw new Error('Demonstração incompleta ou IDs reservados em uso. Nenhum dado foi alterado; use um banco de desenvolvimento novo para recriá-la.')
    }
    if (await tx.usuario.count({ where: { email: { in: contas.map(c => c.email) } } })
      || await tx.republica.count({ where: { codigoEntrada: { in: Object.values(d.codigos) } } })) {
      throw new Error('E-mail ou código reservado à demonstração já está em uso. Nenhum dado foi alterado.')
    }
    await tx.usuario.createMany({ data: contas.map(conta => ({ ...conta, senhaHash })) })
    await tx.republica.createMany({ data: [
      { id: d.republicas.aurora, nome: 'República Aurora — Demonstração', endereco: 'Rua Aurora, 100', codigoEntrada: d.codigos.aurora, adminId: id(1, 2) },
      { id: d.republicas.horizonte, nome: 'República Horizonte — Demonstração', codigoEntrada: d.codigos.horizonte, adminId: id(1, 3) },
    ] })
    await tx.membroRepublica.createMany({ data: [
      { id: d.membros.adminAurora, usuarioId: id(1, 2), republicaId: d.republicas.aurora },
      { id: d.membros.ana, usuarioId: id(1, 4), republicaId: d.republicas.aurora },
      { id: d.membros.carlaAurora, usuarioId: id(1, 6), republicaId: d.republicas.aurora },
      { id: d.membros.adminHorizonte, usuarioId: id(1, 3), republicaId: d.republicas.horizonte },
      { id: d.membros.bruno, usuarioId: id(1, 5), republicaId: d.republicas.horizonte },
    ] })
    await tx.despesa.createMany({ data: [
      { id: d.despesas.internet, republicaId: d.republicas.aurora, criadaPorId: id(1, 2), titulo: 'Internet — Demonstração', categoria: 'INTERNET', valorTotal: '90.00', vencimento },
      { id: d.despesas.agua, republicaId: d.republicas.horizonte, criadaPorId: id(1, 3), titulo: 'Água — Demonstração', categoria: 'AGUA', valorTotal: '60.00', vencimento },
    ] })
    const parcelas = [
      ...dividirIgualmente('90.00', [d.membros.adminAurora, d.membros.ana, d.membros.carlaAurora]).map((p, index) => ({ ...p, id: id(5, index + 1), despesaId: d.despesas.internet })),
      ...dividirIgualmente('60.00', [d.membros.adminHorizonte, d.membros.bruno]).map((p, index) => ({ ...p, id: id(5, index + 4), despesaId: d.despesas.agua })),
    ]
    await tx.rateioDespesa.createMany({ data: parcelas })
    for (const [index, membroId, rateioId, valor] of [
      [1, d.membros.adminAurora, d.rateios.adminAurora, '30.00'],
      [2, d.membros.ana, d.rateios.ana, '10.00'],
      [3, d.membros.adminHorizonte, d.rateios.adminHorizonte, '30.00'],
      [4, d.membros.bruno, d.rateios.bruno, '30.00'],
    ] as const) {
      await tx.pagamento.create({ data: { id: id(6, index), membroId, rateioId, valor, chaveIdempotencia: id(8, index) } })
    }
    // A dívida fica no vínculo antigo; Carla passa a morar na outra república.
    await tx.membroRepublica.update({ where: { id: d.membros.carlaAurora }, data: { ativo: false } })
    await tx.membroRepublica.create({ data: { id: d.membros.carlaHorizonte, usuarioId: id(1, 6), republicaId: d.republicas.horizonte } })
    await tx.tarefa.createMany({ data: [
      { id: id(7, 1), republicaId: d.republicas.aurora, responsavelId: d.membros.ana, titulo: 'Limpar cozinha — Demonstração', prazo: vencimento },
      { id: id(7, 2), republicaId: d.republicas.aurora, responsavelId: d.membros.adminAurora, titulo: 'Retirar lixo — Demonstração', status: 'CONCLUIDA' },
      { id: id(7, 3), republicaId: d.republicas.horizonte, responsavelId: d.membros.bruno, titulo: 'Organizar sala — Demonstração' },
    ] })
    return { criado: true, contas }
  })
}
