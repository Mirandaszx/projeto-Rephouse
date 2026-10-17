import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { Prisma, PrismaClient, RateioDespesa, Usuario } from '../codigo/gerado/prisma/client.js'
import { createDatabase } from '../codigo/infraestrutura/banco/client.js'
import { dividirIgualmente } from '../codigo/modulos/financeiro/dominio/rateio.js'
import { deferred, errorRecord, type RepublicaFixture } from './auxiliares/types.js'

// Nunca usar DATABASE_URL como fallback: o banco de testes precisa ser explícito.
const databaseUrl = process.env.TEST_DATABASE_URL
const database = databaseUrl ? createDatabase(databaseUrl) : null
function getDatabase(): PrismaClient {
  assert.ok(database, 'Defina TEST_DATABASE_URL para executar os testes PostgreSQL.')
  return database
}
const databaseTest = (nome: string, callback: () => Promise<void>) => test(nome, {
  skip: databaseUrl ? false : 'Defina TEST_DATABASE_URL e aplique as migrations nesse banco para executar.',
}, callback)

test.after(async () => {
  if (database) await getDatabase().$disconnect()
})

const senhaHash = '$argon2id$v=19$m=65536,t=3,p=1$fixtureSalt$fixtureHashOnlyForDatabaseTests'

async function usuario(tx: Prisma.TransactionClient, tipoUsuario?: Usuario['tipoUsuario']) {
  return tx.usuario.create({ data: {
    nome: 'Morador de teste',
    email: `teste-${randomUUID()}@example.test`,
    senhaHash,
    ...(tipoUsuario ? { tipoUsuario } : {}),
  } })
}

async function validarPendencias(tx: Prisma.TransactionClient) {
  // A mesma validação acontece no commit; antecipá-la permite verificar e reverter fixtures válidas.
  await tx.$executeRawUnsafe('SET CONSTRAINTS ALL IMMEDIATE')
  await tx.$executeRawUnsafe('SET CONSTRAINTS ALL DEFERRED')
}

async function fixture(tx: Prisma.TransactionClient, quantidade = 2): Promise<RepublicaFixture> {
  const admin = await usuario(tx, 'USUARIO_ADMIN')
  const republica = await tx.republica.create({ data: {
    nome: 'República de teste',
    codigoEntrada: randomUUID().replaceAll('-', '').slice(0, 24).toUpperCase(),
    adminId: admin.id,
  } })
  const membros = [await tx.membroRepublica.create({ data: { usuarioId: admin.id, republicaId: republica.id } })]
  const usuarios = [admin]
  for (let indice = 1; indice < quantidade; indice += 1) {
    const morador = await usuario(tx)
    usuarios.push(morador)
    membros.push(await tx.membroRepublica.create({ data: { usuarioId: morador.id, republicaId: republica.id } }))
  }
  await validarPendencias(tx)
  return { admin, republica, membros, usuarios }
}

async function despesa(tx: Prisma.TransactionClient, contexto: RepublicaFixture, valorTotal = '120.00', criadaPorId = contexto.admin.id) {
  const conta = await tx.despesa.create({ data: {
    republicaId: contexto.republica.id,
    criadaPorId,
    titulo: 'Internet',
    categoria: 'Serviços',
    valorTotal,
    vencimento: new Date('2030-01-15T00:00:00.000Z'),
  } })
  const rateios = []
  for (const rateio of dividirIgualmente(valorTotal, contexto.membros.map(membro => membro.id))) {
    rateios.push(await tx.rateioDespesa.create({ data: { despesaId: conta.id, ...rateio } }))
  }
  await validarPendencias(tx)
  return { conta, rateios }
}

async function pagamento(tx: Prisma.TransactionClient, rateio: RateioDespesa, dados: Partial<Prisma.PagamentoUncheckedCreateInput> = {}) {
  return tx.pagamento.create({ data: {
    rateioId: rateio.id,
    membroId: rateio.membroId,
    valor: rateio.valorDevido,
    ...dados,
  } })
}

async function comRollback(callback: (tx: Prisma.TransactionClient) => Promise<void>) {
  const sentinela = new Error('Fixture concluída: reverter sem persistir dados de teste.')
  try {
    await getDatabase().$transaction(async tx => {
      await callback(tx)
      throw sentinela
    }, { timeout: 20000 })
    assert.fail('A fixture deveria terminar em rollback.')
  } catch (erro) {
    if (erro !== sentinela) throw erro
  }
}

async function rejeitar(callback: (tx: Prisma.TransactionClient) => Promise<void>) {
  await assert.rejects(comRollback(callback), erro => {
    const registro = errorRecord(erro)
    assert.notEqual(registro.code, 'ERR_ASSERTION', 'Falhas de assertions não contam como rejeição pelo banco.')
    return (typeof registro.code === 'string' && /^P\d{4}$/.test(registro.code))
      || (typeof registro.name === 'string' && /^PrismaClient(Known|Unknown)RequestError$/.test(registro.name))
      || registro.name === 'DriverAdapterError'
  })
}

databaseTest('as sete tabelas têm defaults utilizáveis e o rateio é criado atomicamente', async () => {
  await comRollback(async tx => {
    const contexto = await fixture(tx)
    const { conta, rateios } = await despesa(tx, contexto)
    const tarefa = await tx.tarefa.create({ data: {
      republicaId: contexto.republica.id,
      responsavelId: contexto.membros[1].id,
      titulo: 'Limpar a cozinha',
    } })
    const registro = await pagamento(tx, rateios[0])
    await validarPendencias(tx)

    const tabelas = await tx.$queryRawUnsafe<Array<{ table_name: string }>>("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('usuarios', 'republicas', 'membros_republica', 'despesas', 'rateios_despesa', 'pagamentos', 'tarefas')")
    assert.equal(tabelas.length, 7)
    assert.equal(contexto.usuarios[1].tipoUsuario, 'USUARIO_NORMAL')
    assert.equal(contexto.usuarios[1].ativo, true)
    assert.ok(contexto.usuarios[1].criadoEm instanceof Date)
    assert.equal(contexto.republica.ativa, true)
    assert.equal(contexto.membros[1].ativo, true)
    assert.equal(conta.status, 'PENDENTE')
    assert.equal(rateios[1].status, 'PENDENTE')
    assert.equal(rateios[1].valorPago.toFixed(2), '0.00')
    assert.equal(tarefa.status, 'ABERTA')
    assert.equal(registro.comprovanteUrl, null)
    assert.ok(registro.dataPagamento instanceof Date)
    assert.match(contexto.admin.id, /^[0-9a-f-]{36}$/)
  })
})

databaseTest('república e vínculo do administrador podem ser criados na mesma transação', async () => {
  await comRollback(async tx => {
    const contexto = await fixture(tx)
    assert.equal(contexto.admin.tipoUsuario, 'USUARIO_ADMIN')
    assert.equal(contexto.membros[0].usuarioId, contexto.republica.adminId)
    assert.equal(contexto.membros[0].republicaId, contexto.republica.id)
    assert.equal(contexto.membros[0].ativo, true)
  })
})

databaseTest('commit sem vínculo ativo do administrador é rejeitado e reverte a criação', async () => {
  const usuarioId = randomUUID()
  await assert.rejects(getDatabase().$transaction(async tx => {
    await tx.usuario.create({ data: {
      id: usuarioId, nome: 'Admin sem vínculo', email: `${usuarioId}@example.test`, senhaHash, tipoUsuario: 'USUARIO_ADMIN',
    } })
    await tx.republica.create({ data: {
      nome: 'República inválida', codigoEntrada: randomUUID().replaceAll('-', '').slice(0, 24).toUpperCase(), adminId: usuarioId,
    } })
  }))
  assert.equal(await getDatabase().usuario.findUnique({ where: { id: usuarioId } }), null)
})

databaseTest('administrador sem perfil adequado é rejeitado mesmo com vínculo ativo', async () => {
  await rejeitar(async tx => {
    const contexto = await fixture(tx)
    await tx.usuario.update({ where: { id: contexto.admin.id }, data: { tipoUsuario: 'USUARIO_NORMAL' } })
    await validarPendencias(tx)
  })
})

databaseTest('administrador não pode perder o vínculo ativo enquanto continua responsável', async () => {
  await rejeitar(async tx => {
    const contexto = await fixture(tx)
    await tx.membroRepublica.update({ where: { id: contexto.membros[0].id }, data: { ativo: false } })
    await validarPendencias(tx)
  })
})

databaseTest('administrador deve pertencer à mesma república que administra', async () => {
  await rejeitar(async tx => {
    const primeira = await fixture(tx)
    const segunda = await fixture(tx)
    await tx.republica.update({ where: { id: primeira.republica.id }, data: { adminId: segunda.admin.id } })
    await validarPendencias(tx)
  })
})

databaseTest('um usuário tem no máximo uma república ativa', async () => {
  await rejeitar(async tx => {
    const primeira = await fixture(tx)
    const segunda = await fixture(tx)
    await tx.membroRepublica.create({ data: { usuarioId: primeira.usuarios[1].id, republicaId: segunda.republica.id } })
    await validarPendencias(tx)
  })
})

databaseTest('um vínculo inativo permite entrar em outra república sem perder o primeiro', async () => {
  await comRollback(async tx => {
    const primeira = await fixture(tx)
    const segunda = await fixture(tx)
    await tx.membroRepublica.update({ where: { id: primeira.membros[1].id }, data: { ativo: false } })
    const novo = await tx.membroRepublica.create({ data: {
      usuarioId: primeira.usuarios[1].id, republicaId: segunda.republica.id,
    } })
    await validarPendencias(tx)
    assert.equal(novo.ativo, true)
    assert.equal((await tx.membroRepublica.findUniqueOrThrow({ where: { id: primeira.membros[1].id } })).ativo, false)
  })
})

databaseTest('rateio com resto fecha exatamente R$ 100,00 e varia no máximo um centavo', async () => {
  await comRollback(async tx => {
    const contexto = await fixture(tx, 3)
    const { rateios } = await despesa(tx, contexto, '100.00')
    assert.deepEqual(rateios.map(rateio => rateio.valorDevido.toFixed(2)).sort(), ['33.33', '33.33', '33.34'])
  })
})

databaseTest('commit de despesa sem rateios é rejeitado e não deixa registros', async () => {
  const despesaId = randomUUID()
  let adminId: string | undefined
  await assert.rejects(getDatabase().$transaction(async tx => {
    const contexto = await fixture(tx)
    adminId = contexto.admin.id
    await tx.despesa.create({ data: {
      id: despesaId, republicaId: contexto.republica.id, criadaPorId: contexto.admin.id,
      titulo: 'Sem rateio', categoria: 'Teste', valorTotal: '10.00', vencimento: new Date('2030-01-15T00:00:00.000Z'),
    } })
  }, { timeout: 20000 }))
  assert.equal(await getDatabase().despesa.findUnique({ where: { id: despesaId } }), null)
  assert.ok(adminId)
  assert.equal(await getDatabase().usuario.findUnique({ where: { id: adminId } }), null)
})

databaseTest('commit de rateios cuja soma diverge do total é rejeitado', async () => {
  const despesaId = randomUUID()
  await assert.rejects(getDatabase().$transaction(async tx => {
    const contexto = await fixture(tx)
    await tx.despesa.create({ data: {
      id: despesaId, republicaId: contexto.republica.id, criadaPorId: contexto.admin.id,
      titulo: 'Soma inválida', categoria: 'Teste', valorTotal: '10.00', vencimento: new Date('2030-01-15T00:00:00.000Z'),
    } })
    await tx.rateioDespesa.create({ data: { despesaId, membroId: contexto.membros[0].id, valorDevido: '4.00' } })
    await tx.rateioDespesa.create({ data: { despesaId, membroId: contexto.membros[1].id, valorDevido: '5.00' } })
  }, { timeout: 20000 }))
  assert.equal(await getDatabase().despesa.findUnique({ where: { id: despesaId } }), null)
})

databaseTest('rejeita divisão desigual mesmo quando a soma está correta', async () => {
  await rejeitar(async tx => {
    const contexto = await fixture(tx)
    const { rateios } = await despesa(tx, contexto, '10.00')
    await tx.rateioDespesa.update({ where: { id: rateios[0].id }, data: { valorDevido: '4.00' } })
    await tx.rateioDespesa.update({ where: { id: rateios[1].id }, data: { valorDevido: '6.00' } })
    await validarPendencias(tx)
  })
})

databaseTest('rejeita despesa sem valor positivo', async () => {
  await rejeitar(async tx => {
    const contexto = await fixture(tx)
    await tx.despesa.create({ data: {
      republicaId: contexto.republica.id, criadaPorId: contexto.admin.id,
      titulo: 'Valor zero', categoria: 'Teste', valorTotal: '0.00', vencimento: new Date('2030-01-15T00:00:00.000Z'),
    } })
  })
})

databaseTest('MASTER pode criar despesa de uma república sem ser seu membro', async () => {
  await comRollback(async tx => {
    const contexto = await fixture(tx)
    const master = await usuario(tx, 'USUARIO_MASTER')
    const { conta } = await despesa(tx, contexto, '120.00', master.id)
    assert.equal(conta.criadaPorId, master.id)
    assert.equal(await tx.membroRepublica.count({ where: { usuarioId: master.id } }), 0)
  })
})

databaseTest('pagamentos integrais sincronizam valor pago, rateios e status da despesa', async () => {
  await comRollback(async tx => {
    const contexto = await fixture(tx)
    const { conta, rateios } = await despesa(tx, contexto)
    await pagamento(tx, rateios[0])
    await validarPendencias(tx)
    const primeiro = await tx.rateioDespesa.findUniqueOrThrow({ where: { id: rateios[0].id } })
    assert.equal(primeiro.valorPago.toFixed(2), '60.00')
    assert.equal(primeiro.status, 'PAGO')
    assert.equal((await tx.despesa.findUniqueOrThrow({ where: { id: conta.id } })).status, 'PENDENTE')

    await pagamento(tx, rateios[1])
    await validarPendencias(tx)
    const segundo = await tx.rateioDespesa.findUniqueOrThrow({ where: { id: rateios[1].id } })
    assert.equal(segundo.valorPago.toFixed(2), '60.00')
    assert.equal(segundo.status, 'PAGO')
    assert.equal((await tx.despesa.findUniqueOrThrow({ where: { id: conta.id } })).status, 'PAGA')
  })
})

for (const [descricao, valor] of [['zero', '0.00'], ['superior ao devido', '60.01']]) {
  databaseTest(`rejeita pagamento ${descricao}`, async () => {
    await rejeitar(async tx => {
      const contexto = await fixture(tx)
      const { rateios } = await despesa(tx, contexto)
      await pagamento(tx, rateios[0], { valor })
      await validarPendencias(tx)
    })
  })
}

databaseTest('pagamentos parciais acumulam o saldo e quitam apenas no valor exato', async () => {
  await comRollback(async tx => {
    const contexto = await fixture(tx)
    const { conta, rateios } = await despesa(tx, contexto)
    await pagamento(tx, rateios[0], { valor: '20.00' })
    await validarPendencias(tx)
    const parcial = await tx.rateioDespesa.findUniqueOrThrow({ where: { id: rateios[0].id } })
    assert.equal(parcial.status, 'PARCIAL')
    assert.equal(parcial.valorPago.toFixed(2), '20.00')
    await pagamento(tx, rateios[0], { valor: '40.00' })
    await pagamento(tx, rateios[1])
    await validarPendencias(tx)
    assert.equal((await tx.despesa.findUniqueOrThrow({ where: { id: conta.id } })).status, 'PAGA')
  })
})

databaseTest('rejeita segundo pagamento para o mesmo rateio', async () => {
  await rejeitar(async tx => {
    const contexto = await fixture(tx)
    const { rateios } = await despesa(tx, contexto)
    await pagamento(tx, rateios[0])
    await validarPendencias(tx)
    await pagamento(tx, rateios[0])
  })
})

databaseTest('rejeita pagamento registrado para outro morador', async () => {
  await rejeitar(async tx => {
    const contexto = await fixture(tx)
    const { rateios } = await despesa(tx, contexto)
    await pagamento(tx, rateios[0], { membroId: rateios[1].membroId })
    await validarPendencias(tx)
  })
})

databaseTest('rejeita rateio que aponta para membro de outra república', async () => {
  await rejeitar(async tx => {
    const primeira = await fixture(tx)
    const segunda = await fixture(tx)
    const { rateios } = await despesa(tx, primeira)
    await tx.rateioDespesa.delete({ where: { id: rateios[0].id } })
    await tx.rateioDespesa.create({ data: {
      despesaId: rateios[0].despesaId, membroId: segunda.membros[1].id, valorDevido: rateios[0].valorDevido,
    } })
    await validarPendencias(tx)
  })
})

databaseTest('rejeita tarefa atribuída a membro de outra república', async () => {
  await rejeitar(async tx => {
    const primeira = await fixture(tx)
    const segunda = await fixture(tx)
    await tx.tarefa.create({ data: {
      republicaId: primeira.republica.id, responsavelId: segunda.membros[1].id, titulo: 'Tarefa inválida',
    } })
    await validarPendencias(tx)
  })
})

databaseTest('desativação do morador conserva seus rateios, pagamentos e tarefas', async () => {
  await comRollback(async tx => {
    const contexto = await fixture(tx)
    const { conta, rateios } = await despesa(tx, contexto)
    const membro = contexto.membros[1]
    const rateio = rateios.find(item => item.membroId === membro.id)
    assert.ok(rateio)
    const registro = await pagamento(tx, rateio)
    const tarefa = await tx.tarefa.create({ data: {
      republicaId: contexto.republica.id, responsavelId: membro.id, titulo: 'Tarefa histórica',
    } })
    await validarPendencias(tx)
    await tx.membroRepublica.update({ where: { id: membro.id }, data: { ativo: false } })
    await validarPendencias(tx)
    assert.equal((await tx.membroRepublica.findUniqueOrThrow({ where: { id: membro.id } })).ativo, false)
    assert.equal((await tx.rateioDespesa.findUniqueOrThrow({ where: { id: rateio.id } })).status, 'PAGO')
    assert.equal((await tx.pagamento.findUniqueOrThrow({ where: { id: registro.id } })).valor.toFixed(2), '60.00')
    assert.equal((await tx.tarefa.findUniqueOrThrow({ where: { id: tarefa.id } })).responsavelId, membro.id)
    assert.equal((await tx.despesa.findUniqueOrThrow({ where: { id: conta.id } })).status, 'PENDENTE')
  })
})

databaseTest('membro com histórico financeiro não pode ser excluído', async () => {
  await rejeitar(async tx => {
    const contexto = await fixture(tx)
    await despesa(tx, contexto)
    await tx.membroRepublica.delete({ where: { id: contexto.membros[1].id } })
  })
})

for (const operacao of ['alterar', 'excluir']) {
  databaseTest(`não permite ${operacao} um pagamento existente`, async () => {
    await rejeitar(async tx => {
      const contexto = await fixture(tx)
      const { rateios } = await despesa(tx, contexto)
      const registro = await pagamento(tx, rateios[0])
      await validarPendencias(tx)
      if (operacao === 'alterar') {
        await tx.pagamento.update({ where: { id: registro.id }, data: { comprovanteUrl: '/comprovantes/alterado.pdf' } })
      } else {
        await tx.pagamento.delete({ where: { id: registro.id } })
      }
      await validarPendencias(tx)
    })
  })
}

// Este único caso precisa de duas conexões vendo a mesma fixture já commitada.
// Restringi-lo ao banco separado evita persistir fixtures temporárias no banco local da aplicação.
const bancoDedicado = databaseUrl && new URL(databaseUrl).pathname === '/rabbu_mvp_test'
test('transferência de administrador aguarda desativação concorrente e rejeita o membro inativo', {
  skip: bancoDedicado ? false : 'Este teste com fixture commitada exige TEST_DATABASE_URL no banco separado rabbu_mvp_test.',
  timeout: 15000,
}, async () => {
  let contexto: RepublicaFixture | undefined
  let txA: Promise<void> | undefined
  let txB: Promise<{ sucesso?: true; erro?: unknown }> | undefined
  let transferenciaAplicada = false
  const commit = deferred()
  const desativacao = deferred()
  const transferencia = deferred<number>()

  try {
    contexto = await getDatabase().$transaction(async tx => {
      const dados = await fixture(tx)
      await tx.usuario.update({ where: { id: dados.usuarios[1].id }, data: { tipoUsuario: 'USUARIO_ADMIN' } })
      return dados
    })
    const fixtureConcorrente = contexto

    txA = getDatabase().$transaction(async tx => {
      await tx.membroRepublica.update({ where: { id: fixtureConcorrente.membros[1].id }, data: { ativo: false } })
      desativacao.resolve()
      await commit.promise
    }, { timeout: 10000 })
    txA.catch(desativacao.reject)
    await desativacao.promise

    txB = getDatabase().$transaction(async tx => {
      const [conexao] = await tx.$queryRawUnsafe<Array<{ pid: number }>>('SELECT pg_backend_pid() AS pid')
      assert.ok(conexao)
      transferencia.resolve(conexao.pid)
      await tx.republica.update({ where: { id: fixtureConcorrente.republica.id }, data: { adminId: fixtureConcorrente.usuarios[1].id } })
      transferenciaAplicada = true
    }, { timeout: 10000 }).then(
      () => ({ sucesso: true as const }),
      erro => {
        transferencia.reject(erro)
        return { erro }
      },
    )
    const pid = await transferencia.promise
    let bloqueada = false
    const limite = Date.now() + 3000
    while (Date.now() < limite) {
      const [lock] = await getDatabase().$queryRaw<Array<{ esperando: boolean }>>`SELECT EXISTS (
        SELECT 1 FROM pg_locks
        WHERE pid = ${pid} AND locktype = 'advisory'
          AND classid = 20261014 AND objid = 1 AND NOT granted
      ) AS esperando`
      if (lock?.esperando) {
        bloqueada = true
        break
      }
      await new Promise(resolve => setTimeout(resolve, 25))
    }
    assert.equal(bloqueada, true, 'A transferência deve aguardar o lock administrativo da desativação.')
    assert.equal(transferenciaAplicada, false)

    commit.resolve()
    await txA
    const resultado = await txB
    // SERIALIZABLE pode detectar o conflito no UPDATE ou na validação/COMMIT.
    assert.ok(resultado.erro, 'A transferência deve ser rejeitada por conflito ou administrador sem vínculo ativo.')
    const causas: unknown[] = [resultado.erro]
    const visitadas = new Set<object>()
    let rejeicaoValida = false
    while (causas.length > 0) {
      const causa = causas.pop()
      if (!causa || typeof causa !== 'object' || visitadas.has(causa)) continue
      visitadas.add(causa)
      const registro = errorRecord(causa)
      if ((typeof registro.code === 'string' && ['P2034', '40001', '40P01', 'P0001'].includes(registro.code))
        || (typeof registro.originalCode === 'string' && ['40001', '40P01', 'P0001'].includes(registro.originalCode))
        || registro.kind === 'TransactionWriteConflict'
        || (typeof registro.message === 'string' && /administrador.*v[ií]nculo/i.test(registro.message))) rejeicaoValida = true
      causas.push(registro.cause, registro.meta, registro.driverAdapterError)
    }
    assert.equal(rejeicaoValida, true, 'A rejeição deve decorrer de serialização ou da integridade do administrador.')
    assert.equal((await getDatabase().republica.findUniqueOrThrow({ where: { id: contexto.republica.id } })).adminId, contexto.admin.id)
    assert.equal((await getDatabase().membroRepublica.findUniqueOrThrow({ where: { id: contexto.membros[1].id } })).ativo, false)
  } finally {
    commit.resolve()
    await Promise.allSettled([txA, txB].filter(Boolean))
    if (contexto) {
      const fixtureParaLimpar = contexto
      await getDatabase().$transaction(async tx => {
        await tx.membroRepublica.deleteMany({ where: { id: { in: fixtureParaLimpar.membros.map(membro => membro.id) } } })
        await tx.republica.delete({ where: { id: fixtureParaLimpar.republica.id } })
        await tx.usuario.deleteMany({ where: { id: { in: fixtureParaLimpar.usuarios.map(morador => morador.id) } } })
      })
    }
  }
})
