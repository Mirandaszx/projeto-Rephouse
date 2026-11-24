import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import pg from 'pg'
import { createDatabase } from '../codigo/infraestrutura/banco/client.js'
import { semearDemonstracao } from '../codigo/infraestrutura/banco/demonstracao.js'
import { semearVitrine, vitrine } from '../codigo/infraestrutura/banco/vitrine.js'
import { civilDate } from '../codigo/configuracao/time-zone.js'

const url = process.env.TEST_DATABASE_URL
test('vitrine: dados realistas convivem com a demonstração, respeitam o rateio e não duplicam', { skip: !url || new URL(url).pathname !== '/rabbu_mvp_test', timeout: 90000 }, async () => {
  assert.ok(url)
  const schema = `vitrine_test_${randomUUID().replaceAll('-', '')}`
  const setup = new pg.Client({ connectionString: url, options: `-c search_path=${schema}` })
  await setup.connect(); await setup.query(`CREATE SCHEMA "${schema}"`)
  const isolated = new URL(url); isolated.searchParams.set('schema', schema)
  const db = createDatabase(isolated.toString())
  try {
    for (const migration of (await readdir('prisma/migracoes')).filter(name => /^\d/.test(name)).sort()) await setup.query(await readFile(`prisma/migracoes/${migration}/migration.sql`, 'utf8'))
    const senha = 'senha-exclusiva-fixture-vitrine123'
    await semearDemonstracao(db, senha)
    assert.equal((await semearVitrine(db, senha)).criado, true)
    // Segunda execução (reimplantação da demo) não cria nem altera nada.
    assert.equal((await semearVitrine(db, senha)).criado, false)
    await assert.rejects(semearVitrine(db, senha, 'production'))

    const despesas = await db.despesa.findMany({ where: { republicaId: vitrine.republica }, include: { rateios: { include: { pagamentos: true } } } })
    assert.equal(despesas.length, vitrine.despesas.length)
    for (const despesa of despesas) {
      assert.equal(despesa.rateios.length, vitrine.membros.length, despesa.titulo)
      const devido = despesa.rateios.reduce((total, r) => total + Math.round(Number(r.valorDevido) * 100), 0)
      assert.equal(devido, Math.round(Number(despesa.valorTotal) * 100), `${despesa.titulo}: parcelas somam o total`)
      for (const rateio of despesa.rateios) {
        const pago = rateio.pagamentos.reduce((total, p) => total + Math.round(Number(p.valor) * 100), 0)
        assert.equal(pago, Math.round(Number(rateio.valorPago) * 100), `${despesa.titulo}: valor pago acompanha os pagamentos`)
      }
    }
    // A apresentação precisa de situações variadas: conta atrasada, parcial e futura.
    const hoje = new Date(`${civilDate()}T00:00:00.000Z`)
    const restante = (d: typeof despesas[number]) => d.rateios.reduce((t, r) => t + Number(r.valorDevido) - Number(r.valorPago), 0)
    assert.ok(despesas.some(d => d.vencimento < hoje && restante(d) > 0), 'há uma conta atrasada')
    assert.ok(despesas.some(d => d.rateios.some(r => Number(r.valorPago) > 0 && Number(r.valorPago) < Number(r.valorDevido))), 'há um pagamento parcial')
    assert.ok(despesas.some(d => d.vencimento > hoje && restante(d) > 0), 'há contas a vencer')
    const tarefas = await db.tarefa.findMany({ where: { republicaId: vitrine.republica } })
    assert.ok(tarefas.some(t => t.responsavelId === null) && tarefas.some(t => t.status === 'CONCLUIDA'))
    // Os validadores da demo gravam na outra casa; a vitrine não tem dados de ensaio.
    assert.equal(await db.despesa.count({ where: { republicaId: vitrine.republica, titulo: { contains: 'Ensaio' } } }), 0)
  } finally {
    await db.$disconnect(); await setup.query(`DROP SCHEMA "${schema}" CASCADE`); await setup.end()
  }
})
