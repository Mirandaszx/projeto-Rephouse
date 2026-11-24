import { hash, argon2id } from 'argon2'
import { z } from 'zod'
import type { PrismaClient, TipoUsuario } from '../../gerado/prisma/client.js'
import { executarTransacaoAcid } from './transaction.js'
import { dividirIgualmente } from '../../modulos/financeiro/dominio/rateio.js'
import { civilDate } from '../../configuracao/time-zone.js'

// República de vitrine para apresentações: dados fictícios e realistas, separados da demonstração
// técnica (Aurora/Horizonte), onde os validadores gravam seus ensaios.
// IDs reservados (prefixo df) tornam a execução repetível sem procurar ou sobrescrever dados reais.
const id = (tipo: number, numero: number) => `df000000-0000-4000-8000-${String(tipo).padStart(4, '0')}${String(numero).padStart(8, '0')}`

const contas = [
  { id: id(1, 1), nome: 'Camila Almeida', email: 'camila@demo.rephouse.test', tipoUsuario: 'USUARIO_ADMIN' },
  { id: id(1, 2), nome: 'João Victor', email: 'joao@demo.rephouse.test', tipoUsuario: 'USUARIO_NORMAL' },
  { id: id(1, 3), nome: 'Marina Costa', email: 'marina@demo.rephouse.test', tipoUsuario: 'USUARIO_NORMAL' },
  { id: id(1, 4), nome: 'Pedro Henrique', email: 'pedro@demo.rephouse.test', tipoUsuario: 'USUARIO_NORMAL' },
] satisfies { id: string; nome: string; email: string; tipoUsuario: TipoUsuario }[]
const membros = contas.map((_, index) => id(3, index + 1))
const [camila, joao, marina, pedro] = membros as [string, string, string, string]

// Dias relativos à data civil de hoje: "vence em breve" e "atrasada" continuam corretos no dia da apresentação.
// pagos: quanto cada morador (na ordem de `membros`) já pagou da própria parte; 'tudo' quita a parte.
type Pago = 'tudo' | string | null
const despesas: { titulo: string; categoria: string; valor: string; dias: number; pagos: [Pago, Pago, Pago, Pago] }[] = [
  { titulo: 'Aluguel', categoria: 'Moradia', valor: '2400.00', dias: -62, pagos: ['tudo', 'tudo', 'tudo', 'tudo'] },
  { titulo: 'Conta de luz', categoria: 'Contas da casa', valor: '172.80', dias: -58, pagos: ['tudo', 'tudo', 'tudo', 'tudo'] },
  { titulo: 'Aluguel', categoria: 'Moradia', valor: '2400.00', dias: -32, pagos: ['tudo', 'tudo', 'tudo', 'tudo'] },
  { titulo: 'Conta de luz', categoria: 'Contas da casa', valor: '186.40', dias: -28, pagos: ['tudo', 'tudo', 'tudo', 'tudo'] },
  { titulo: 'Internet', categoria: 'Contas da casa', valor: '120.00', dias: -26, pagos: ['tudo', 'tudo', 'tudo', 'tudo'] },
  { titulo: 'Compras do mês', categoria: 'Mercado', valor: '318.76', dias: -22, pagos: ['tudo', 'tudo', 'tudo', 'tudo'] },
  { titulo: 'Conta de água', categoria: 'Contas da casa', valor: '92.40', dias: -3, pagos: ['tudo', null, 'tudo', null] },
  { titulo: 'Aluguel', categoria: 'Moradia', valor: '2400.00', dias: 6, pagos: ['tudo', 'tudo', '300.00', null] },
  { titulo: 'Internet', categoria: 'Contas da casa', valor: '120.00', dias: 12, pagos: [null, 'tudo', null, null] },
  { titulo: 'Botijão de gás', categoria: 'Contas da casa', valor: '110.00', dias: 20, pagos: [null, null, null, null] },
]
const tarefas: { titulo: string; descricao?: string; responsavel: string | null; dias: number | null; concluida?: boolean }[] = [
  { titulo: 'Limpar a cozinha', descricao: 'Louça, bancada e fogão.', responsavel: joao, dias: 1 },
  { titulo: 'Levar o lixo reciclável', responsavel: pedro, dias: 2 },
  { titulo: 'Comprar produtos de limpeza', descricao: 'Detergente, sabão em pó e esponjas.', responsavel: marina, dias: 4 },
  { titulo: 'Combinar a faxina do mês', responsavel: null, dias: 7 },
  { titulo: 'Trocar o filtro de água', responsavel: camila, dias: -5, concluida: true },
  { titulo: 'Organizar a geladeira', responsavel: marina, dias: -2, concluida: true },
]

export const vitrine = {
  contas,
  republica: id(2, 1),
  codigo: 'DEMOJARDIM',
  membros,
  despesas: despesas.map((_, index) => id(4, index + 1)),
  tarefas: tarefas.map((_, index) => id(7, index + 1)),
}
const esperado = { usuarios: contas.length, republicas: 1, membros: membros.length, despesas: despesas.length, rateios: despesas.length * membros.length,
  pagamentos: despesas.flatMap(d => d.pagos).filter(Boolean).length, tarefas: tarefas.length }

export async function semearVitrine(db: PrismaClient, senha: string | undefined, ambiente = process.env.NODE_ENV ?? 'development') {
  if (ambiente === 'production') throw new Error('Dados de demonstração não são permitidos em produção.')
  if (!['development', 'test'].includes(ambiente)) throw new Error('Use ambiente development ou test para criar a vitrine.')
  const password = z.string().min(12).max(128).parse(senha)
  const senhaHash = await hash(password, { type: argon2id })
  const hoje = civilDate()
  const dia = (deslocamento: number) => { const data = new Date(`${hoje}T00:00:00.000Z`); data.setUTCDate(data.getUTCDate() + deslocamento); return data }
  return executarTransacaoAcid(db, async tx => {
    const existentes = {
      usuarios: await tx.usuario.count({ where: { id: { in: contas.map(c => c.id) } } }),
      republicas: await tx.republica.count({ where: { id: vitrine.republica } }),
      membros: await tx.membroRepublica.count({ where: { id: { in: membros } } }),
      despesas: await tx.despesa.count({ where: { id: { in: vitrine.despesas } } }),
      rateios: await tx.rateioDespesa.count({ where: { despesaId: { in: vitrine.despesas } } }),
      pagamentos: await tx.pagamento.count({ where: { rateio: { despesaId: { in: vitrine.despesas } } } }),
      tarefas: await tx.tarefa.count({ where: { id: { in: vitrine.tarefas } } }),
    }
    if (Object.values(existentes).some(count => count > 0)) {
      // Já criada: não altera nada (nem pagamentos feitos durante uma apresentação).
      if (existentes.usuarios === esperado.usuarios && existentes.republicas === 1 && existentes.despesas === esperado.despesas) return { criado: false, contas }
      throw new Error('Vitrine incompleta ou IDs reservados em uso. Nenhum dado foi alterado.')
    }
    if (await tx.usuario.count({ where: { email: { in: contas.map(c => c.email) } } })
      || await tx.republica.count({ where: { codigoEntrada: vitrine.codigo } })) {
      throw new Error('E-mail ou código reservado à vitrine já está em uso. Nenhum dado foi alterado.')
    }
    await tx.usuario.createMany({ data: contas.map(conta => ({ ...conta, senhaHash })) })
    await tx.republica.create({ data: { id: vitrine.republica, nome: 'República Jardim', endereco: 'Rua das Acácias, 214', codigoEntrada: vitrine.codigo, adminId: contas[0]!.id } })
    await tx.membroRepublica.createMany({ data: membros.map((membroId, index) => ({ id: membroId, usuarioId: contas[index]!.id, republicaId: vitrine.republica })) })
    let pagamento = 0
    for (const [index, despesa] of despesas.entries()) {
      const despesaId = vitrine.despesas[index]!
      await tx.despesa.create({ data: { id: despesaId, republicaId: vitrine.republica, criadaPorId: contas[0]!.id, titulo: despesa.titulo, categoria: despesa.categoria, valorTotal: despesa.valor, vencimento: dia(despesa.dias) } })
      const parcelas = dividirIgualmente(despesa.valor, membros).map((parcela, posicao) => ({ ...parcela, id: id(5, index * 10 + posicao + 1), despesaId }))
      await tx.rateioDespesa.createMany({ data: parcelas })
      for (const [posicao, pago] of despesa.pagos.entries()) {
        if (!pago) continue
        const parcela = parcelas[posicao]!
        pagamento++
        // Pago dois dias antes do vencimento (ou ontem, se ainda vai vencer): "Pago neste mês" fica realista.
        await tx.pagamento.create({ data: { id: id(6, pagamento), membroId: parcela.membroId, rateioId: parcela.id, valor: pago === 'tudo' ? parcela.valorDevido : pago,
          chaveIdempotencia: id(8, pagamento), dataPagamento: dia(Math.min(despesa.dias - 2, -1)) } })
      }
    }
    await tx.tarefa.createMany({ data: tarefas.map((tarefa, index) => ({ id: vitrine.tarefas[index]!, republicaId: vitrine.republica, criadorId: contas[0]!.id,
      responsavelId: tarefa.responsavel, titulo: tarefa.titulo, descricao: tarefa.descricao ?? null, prazo: tarefa.dias === null ? null : dia(tarefa.dias),
      status: tarefa.concluida ? 'CONCLUIDA' : 'ABERTA' })) })
    return { criado: true, contas }
  })
}
