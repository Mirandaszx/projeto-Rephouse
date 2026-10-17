import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { Prisma, PrismaClient, Usuario } from '../codigo/gerado/prisma/client.js'
import { createDatabase } from '../codigo/infraestrutura/banco/client.js'
import { executarTransacaoAcid } from '../codigo/infraestrutura/banco/transaction.js'
import { criarDespesaComRateio, registrarPagamento } from '../codigo/modulos/financeiro/financeiro.service.js'
import { deferred, errorRecord, type RepublicaFixture } from './auxiliares/types.js'

// Nunca usar DATABASE_URL como fallback, nem persistir fixtures fora do banco dedicado.
const databaseUrl = process.env.TEST_DATABASE_URL
const database = databaseUrl ? createDatabase(databaseUrl) : null
function getDatabase(): PrismaClient {
  assert.ok(database, 'Defina TEST_DATABASE_URL para executar os testes PostgreSQL.')
  return database
}
const bancoDedicado = databaseUrl && new URL(databaseUrl).pathname === '/rabbu_mvp_test'
const databaseTest = (nome: string, callback: () => Promise<void>, { persistente = false } = {}) => test(nome, {
  skip: !databaseUrl
    ? 'Defina TEST_DATABASE_URL e aplique as migrations nesse banco para executar.'
    : persistente && !bancoDedicado
      ? 'Fixtures commitadas exigem o banco separado rabbu_mvp_test.'
      : false,
  timeout: 25000,
}, callback)

test.after(async () => {
  if (database) await getDatabase().$disconnect()
})

const senhaHash = '$argon2id$v=19$m=65536,t=3,p=1$fixtureSalt$fixtureHashOnlyForAcidTests'

async function usuario(tx: Prisma.TransactionClient, dados: Partial<Prisma.UsuarioUncheckedCreateInput> = {}) {
  return tx.usuario.create({ data: {
    nome: 'Morador ACID',
    email: `acid-${randomUUID()}@example.test`,
    senhaHash,
    ...dados,
  } })
}

async function fixture(tx: Prisma.TransactionClient, quantidade = 2): Promise<RepublicaFixture> {
  const admin = await usuario(tx, { tipoUsuario: 'USUARIO_ADMIN' })
  const republica = await tx.republica.create({ data: {
    nome: 'República ACID',
    codigoEntrada: randomUUID().replaceAll('-', '').slice(0, 24).toUpperCase(),
    adminId: admin.id,
  } })
  const usuarios = [admin]
  const membros = [await tx.membroRepublica.create({ data: {
    usuarioId: admin.id, republicaId: republica.id,
  } })]
  for (let indice = 1; indice < quantidade; indice += 1) {
    const morador = await usuario(tx)
    usuarios.push(morador)
    membros.push(await tx.membroRepublica.create({ data: {
      usuarioId: morador.id, republicaId: republica.id,
    } }))
  }
  return { admin, republica, usuarios, membros }
}

function dadosDespesa(contexto: RepublicaFixture, dados: Partial<Parameters<typeof criarDespesaComRateio>[1]> = {}) {
  return {
    republicaId: contexto.republica.id,
    criadaPorId: contexto.admin.id,
    titulo: `Despesa ACID ${randomUUID()}`,
    categoria: 'Teste',
    valorTotal: '100.00',
    vencimento: new Date('2030-01-15T00:00:00.000Z'),
    membroIds: contexto.membros.map(membro => membro.id),
    ...dados,
  }
}

async function limparContextos(contextos: RepublicaFixture[]) {
  await executarTransacaoAcid(getDatabase(), async tx => {
    for (const contexto of contextos) {
      // IDs exatos: nenhuma tabela é truncada, nem dados preexistentes são removidos.
      await tx.membroRepublica.deleteMany({ where: { id: { in: contexto.membros.map(membro => membro.id) } } })
      await tx.republica.delete({ where: { id: contexto.republica.id } })
      await tx.usuario.deleteMany({ where: { id: { in: contexto.usuarios.map(morador => morador.id) } } })
    }
  })
}

databaseTest('A: falha em um rateio reverte também a despesa criada pelo serviço', async () => {
  let contextos: RepublicaFixture[] = []
  let dados: ReturnType<typeof dadosDespesa> | undefined
  try {
    contextos = await executarTransacaoAcid(getDatabase(), async tx => [
      await fixture(tx),
      await fixture(tx),
    ])
    const [primeira, segunda] = contextos
    assert.ok(primeira && segunda)
    dados = dadosDespesa(primeira, {
      membroIds: [primeira.membros[0].id, segunda.membros[1].id],
    })
    await assert.rejects(criarDespesaComRateio(getDatabase(), dados), erro => {
      const registro = errorRecord(erro)
      assert.notEqual(registro.code, 'ERR_ASSERTION')
      return typeof registro.message === 'string' && /rateio|rep[uú]blica|constraint/i.test(registro.message)
    })
    assert.equal(await getDatabase().despesa.count({ where: { titulo: dados.titulo } }), 0)
    assert.equal(await getDatabase().rateioDespesa.count({ where: {
      membroId: { in: contextos.flatMap(contexto => contexto.membros.map(membro => membro.id)) },
    } }), 0)
  } finally {
    // Se uma regressão persistir uma despesa parcial, remover somente a fixture identificada.
    if (dados) {
      const fixtureParaLimpar = dados
      await executarTransacaoAcid(getDatabase(), async tx => {
        const despesas = await tx.despesa.findMany({ where: { titulo: fixtureParaLimpar.titulo }, select: { id: true } })
        const ids = despesas.map(despesa => despesa.id)
        await tx.rateioDespesa.deleteMany({ where: { despesaId: { in: ids } } })
        await tx.despesa.deleteMany({ where: { id: { in: ids } } })
      })
    }
    if (contextos.length > 0) await limparContextos(contextos)
  }
}, { persistente: true })

databaseTest('C: serviços fecham R$ 100,00 entre três membros e pagam somente o valor devido', async () => {
  const sentinela = new Error('Fixture financeira validada: executar rollback intencional.')
  let despesaId: string | undefined
  let pagamentoId: string | undefined
  let usuarioId: string | undefined
  await assert.rejects(executarTransacaoAcid(getDatabase(), async tx => {
    const contexto = await fixture(tx, 3)
    usuarioId = contexto.admin.id
    // Reutiliza a transação real externa; a sentinela impede persistir histórico imutável.
    const prismaEscopado = {
      $transaction: <T>(operacao: (transaction: Prisma.TransactionClient) => Promise<T>) => operacao(tx),
    } as unknown as PrismaClient
    const despesa = await criarDespesaComRateio(prismaEscopado, dadosDespesa(contexto))
    despesaId = despesa.id
    assert.equal(despesa.valorTotal.toFixed(2), '100.00')
    assert.deepEqual(despesa.rateios.map(rateio => rateio.valorDevido.toFixed(2)).sort(), ['33.33', '33.33', '33.34'])
    assert.equal(despesa.rateios.reduce((total, rateio) => total + BigInt(rateio.valorDevido.toFixed(2).replace('.', '')), 0n), 10000n)

    for (const rateio of despesa.rateios) {
      const entradaExterna = {
        rateioId: rateio.id,
        membroId: rateio.membroId,
        comprovanteUrl: '/comprovantes/fixture-acid.pdf',
        valor: rateio.valorDevido.toFixed(2), // Agora a API aceita valores parciais explícitos.
      }
      const pagamento = await registrarPagamento(prismaEscopado, entradaExterna)
      pagamentoId = pagamento.id
      assert.equal(pagamento.valor.toFixed(2), rateio.valorDevido.toFixed(2))
      const atualizado = await tx.rateioDespesa.findUniqueOrThrow({ where: { id: rateio.id } })
      assert.equal(atualizado.valorPago.toFixed(2), rateio.valorDevido.toFixed(2))
      assert.equal(atualizado.status, 'PAGO')
    }
    // Executa agora as mesmas regras adiadas que seriam verificadas no commit.
    await tx.$executeRawUnsafe('SET CONSTRAINTS ALL IMMEDIATE')
    assert.equal((await tx.despesa.findUniqueOrThrow({ where: { id: despesa.id } })).status, 'PAGA')
    throw sentinela
  }), erro => erro === sentinela)
  assert.ok(despesaId)
  assert.ok(pagamentoId)
  assert.ok(usuarioId)
  assert.equal(await getDatabase().despesa.findUnique({ where: { id: despesaId } }), null)
  assert.equal(await getDatabase().pagamento.findUnique({ where: { id: pagamentoId } }), null)
  assert.equal(await getDatabase().usuario.findUnique({ where: { id: usuarioId } }), null)
})

databaseTest('I: duas transações concorrentes repetem a leitura após conflito e preservam ambas as atualizações', async () => {
  let morador: Usuario | undefined
  const operacoes: Promise<Usuario>[] = []
  const tentativas: [number, number] = [0, 0]
  const leituras: [number[], number[]] = [[], []]
  let leiturasIniciais = 0
  const leiturasCompletas = deferred()
  leiturasCompletas.promise.catch(() => {})
  try {
    morador = await executarTransacaoAcid(getDatabase(), tx => usuario(tx, { nome: '0' }))
    const fixtureMorador = morador
    for (const indice of [0, 1] as const) {
      const operacao = executarTransacaoAcid(getDatabase(), async tx => {
        tentativas[indice] += 1
        const atual = await tx.usuario.findUniqueOrThrow({ where: { id: fixtureMorador.id } })
        leituras[indice].push(Number(atual.nome))
        if (tentativas[indice] === 1) {
          leiturasIniciais += 1
          if (leiturasIniciais === 2) leiturasCompletas.resolve()
          // As duas conexões leem o mesmo estado antes de disputar os locks de escrita.
          await leiturasCompletas.promise
        }
        return tx.usuario.update({ where: { id: fixtureMorador.id }, data: { nome: String(Number(atual.nome) + 1) } })
      }).catch(erro => {
        leiturasCompletas.reject(erro)
        throw erro
      })
      operacoes.push(operacao)
    }
    await Promise.all(operacoes)
    assert.deepEqual(leituras.map(valores => valores[0]), [0, 0])
    assert.ok(tentativas.some(quantidade => quantidade >= 2), 'Uma transação deve sofrer conflito e repetir a callback inteira.')
    assert.ok(leituras.some(valores => valores.slice(1).includes(1)), 'A repetição deve reler o estado já commitado.')
    assert.equal((await getDatabase().usuario.findUniqueOrThrow({ where: { id: morador.id } })).nome, '2')
  } finally {
    leiturasCompletas.resolve()
    await Promise.allSettled(operacoes)
    if (morador) {
      const usuarioId = morador.id
      await executarTransacaoAcid(getDatabase(), tx => tx.usuario.delete({ where: { id: usuarioId } }))
    }
  }
}, { persistente: true })

databaseTest('I/D: isolamento serializável, commit síncrono, WAL e tabelas permanentes estão ativos', async () => {
  const configuracoes = await getDatabase().$queryRawUnsafe<Array<{ name: string; setting: string }>>(`SELECT name, setting FROM pg_settings
    WHERE name IN ('default_transaction_isolation', 'synchronous_commit', 'fsync', 'full_page_writes')`)
  assert.deepEqual(Object.fromEntries(configuracoes.map(item => [item.name, item.setting])), {
    default_transaction_isolation: 'serializable',
    synchronous_commit: 'on',
    fsync: 'on',
    full_page_writes: 'on',
  })
  const tabelas = await getDatabase().$queryRawUnsafe<Array<{ relname: string; relpersistence: string }>>(`SELECT c.relname, c.relpersistence::text AS relpersistence
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN
      ('usuarios', 'republicas', 'membros_republica', 'despesas', 'rateios_despesa', 'pagamentos', 'tarefas')`)
  assert.equal(tabelas.length, 7)
  assert.ok(tabelas.every(tabela => tabela.relpersistence === 'p'), 'Todas as tabelas devem ser permanentes e protegidas pelo WAL.')
  await executarTransacaoAcid(getDatabase(), async tx => {
    const [configuracao] = await tx.$queryRawUnsafe<Array<{ isolamento: string; commit_sincrono: string }>>(`SELECT
      current_setting('transaction_isolation') AS isolamento,
      current_setting('synchronous_commit') AS commit_sincrono`)
    assert.ok(configuracao)
    assert.equal(configuracao.isolamento, 'serializable')
    assert.equal(configuracao.commit_sincrono, 'on')
  })
})

databaseTest('D: um commit é visível por uma conexão nova e independente', async () => {
  let morador: Usuario | undefined
  let outraConexao: PrismaClient | undefined
  try {
    morador = await executarTransacaoAcid(getDatabase(), tx => usuario(tx, { nome: 'Commit ACID confirmado' }))
    assert.ok(databaseUrl)
    outraConexao = createDatabase(databaseUrl)
    const persistido = await outraConexao.usuario.findUniqueOrThrow({ where: { id: morador.id } })
    assert.equal(persistido.nome, 'Commit ACID confirmado')
    assert.equal(persistido.email, morador.email)
  } finally {
    if (outraConexao) await outraConexao.$disconnect()
    if (morador) {
      const usuarioId = morador.id
      await executarTransacaoAcid(getDatabase(), tx => tx.usuario.delete({ where: { id: usuarioId } }))
    }
  }
}, { persistente: true })

// As falhas determinísticas verificam o limite e os casos que a disputa real não garante produzir.
for (const [descricao, conflito] of [
  ['Prisma P2034', { code: 'P2034' }],
  ['SQLSTATE 40001 encapsulado', { cause: { code: '40001' } }],
  ['SQLSTATE 40P01 no adapter', { meta: { driverAdapterError: { cause: { originalCode: '40P01' } } } }],
] as const) {
  test(`retry limita conflitos ${descricao} a três tentativas completas`, async () => {
    let leituras = 0
    const erro = Object.assign(new Error('Conflito transitório durante o commit.'), conflito)
    const prisma = { $transaction: async <T>(operacao: (tx: Prisma.TransactionClient) => Promise<T>) => {
      await operacao({ $executeRaw: async () => 0 } as unknown as Prisma.TransactionClient)
      throw erro
    } } as unknown as PrismaClient
    await assert.rejects(executarTransacaoAcid(prisma, async () => { leituras += 1 }), recebido => recebido === erro)
    assert.equal(leituras, 3)
  })
}

test('retry não repete uma violação de regra de negócio', async () => {
  let tentativas = 0
  const erro = Object.assign(new Error('Já existe pagamento para o rateio.'), { code: 'P2002' })
  const prisma = {
    $transaction: async <T>(operacao: (tx: Prisma.TransactionClient) => Promise<T>) => operacao({ $executeRaw: async () => 0 } as unknown as Prisma.TransactionClient),
  } as unknown as PrismaClient
  await assert.rejects(executarTransacaoAcid(prisma, async () => {
    tentativas += 1
    throw erro
  }), recebido => recebido === erro)
  assert.equal(tentativas, 1)
})
