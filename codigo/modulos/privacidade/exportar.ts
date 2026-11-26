import type { PrismaClient } from '../../gerado/prisma/client.js'

/**
 * LGPD, art. 18, II e V (26/11/2026): cópia dos dados da própria pessoa, em JSON legível por outro sistema.
 * Os campos são escolhidos um a um: senhas, hashes, tokens e o conteúdo de arquivos nunca entram. Valores em reais
 * saem como texto ("12.50") para não perder precisão.
 */
export async function exportarDadosPessoais(db: PrismaClient, usuarioId: string) {
  const conta = await db.usuario.findUniqueOrThrow({ where: { id: usuarioId }, select: {
    id: true, nome: true, email: true, tipoUsuario: true, criadoEm: true,
    emailVerificado: { select: { verificadoEm: true } },
    identidadeGoogle: { select: { criadaEm: true } },
    foto: { select: { mimeType: true, tamanho: true, atualizadaEm: true } },
  } })
  const vinculos = await db.membroRepublica.findMany({ where: { usuarioId }, orderBy: { entrouEm: 'asc' },
    select: { id: true, ativo: true, entrouEm: true, republica: { select: { id: true, nome: true } } } })
  const membros = vinculos.map(vinculo => vinculo.id)
  const [suasPartes, pagamentos, despesasCriadas, tarefas, notificacoes] = await Promise.all([
    db.rateioDespesa.findMany({ where: { membroId: { in: membros } }, select: { id: true, valorDevido: true, valorPago: true, status: true,
      despesa: { select: { id: true, titulo: true, categoria: true, valorTotal: true, vencimento: true, republicaId: true } } } }),
    db.pagamento.findMany({ where: { membroId: { in: membros } }, orderBy: { dataPagamento: 'asc' },
      select: { id: true, rateioId: true, valor: true, dataPagamento: true, comprovante: { select: { mimeType: true, tamanho: true, criadoEm: true } } } }),
    db.despesa.findMany({ where: { criadaPorId: usuarioId }, orderBy: { criadaEm: 'asc' },
      select: { id: true, titulo: true, categoria: true, valorTotal: true, vencimento: true, status: true, criadaEm: true, republicaId: true } }),
    db.tarefa.findMany({ where: { OR: [{ responsavelId: { in: membros } }, { criadorId: usuarioId }] }, orderBy: { criadaEm: 'asc' },
      select: { id: true, titulo: true, descricao: true, prazo: true, status: true, criadaEm: true, republicaId: true,
        responsavelId: true, criadorId: true } }),
    db.notificacao.findMany({ where: { membroId: { in: membros } }, orderBy: { criadoEm: 'asc' },
      select: { id: true, lidaEm: true, criadoEm: true, evento: { select: { categoria: true, tipo: true, titulo: true } } } }),
  ])
  return {
    geradoEm: new Date().toISOString(),
    sobre: 'Cópia dos seus dados pessoais no RepHouse (LGPD, art. 18). Despesas e tarefas aparecem quando você participa delas; os dados dos outros moradores não entram.',
    conta: {
      id: conta.id, nome: conta.nome, email: conta.email, tipo: conta.tipoUsuario, criadaEm: conta.criadoEm,
      emailConfirmadoEm: conta.emailVerificado?.verificadoEm ?? null,
      googleLigadoEm: conta.identidadeGoogle?.criadaEm ?? null,
      foto: conta.foto,
    },
    republicas: vinculos.map(({ id, ativo, entrouEm, republica }) => ({ vinculoId: id, republica, ativo, entrouEm })),
    suasPartesNasDespesas: suasPartes,
    pagamentos,
    despesasCriadas,
    tarefas,
    notificacoes,
  }
}
