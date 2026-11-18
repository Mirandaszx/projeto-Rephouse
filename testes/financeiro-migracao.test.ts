import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import pg from 'pg'
import { hash } from 'argon2'

test('migration 2.2 preserva despesas, rateios, pagamentos e bytes de comprovantes anteriores', { timeout: 30000 }, async () => {
  const url = process.env.TEST_DATABASE_URL
  if (!url || new URL(url).pathname !== '/rabbu_mvp_test') throw new Error('Use exclusivamente TEST_DATABASE_URL para rabbu_mvp_test.')
  const schema = 'financial_migration_' + randomUUID().replaceAll('-', '')
  const db = new pg.Client({ connectionString: url, options: `-c search_path=${schema}` })
  await db.connect()
  try {
    await db.query(`CREATE SCHEMA "${schema}"`)
    const migrations = (await readdir('prisma/migracoes')).filter(name => /^\d/.test(name)).sort()
    assert.equal(migrations.at(-1),'202611170001_evolucao_financeiro')
    for (const name of migrations.slice(0,-1)) await db.query(await readFile(`prisma/migracoes/${name}/migration.sql`,'utf8'))
    const user=randomUUID(), house=randomUUID(), member=randomUUID(), expense=randomUUID(), share=randomUUID(), payment=randomUUID()
    const proof=Buffer.from('%PDF-1.4\nhistorico anterior a recorrencias\n%%EOF')
    await db.query('BEGIN')
    const passwordHash = await hash('Senha-apenas-da-migracao-de-teste-2026')
    await db.query("INSERT INTO usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES ($1,'Conta histórica','historico@migration.rephouse.test',$2,'USUARIO_ADMIN')",[user,passwordHash])
    await db.query("INSERT INTO republicas(id,nome,admin_id,codigo_entrada) VALUES ($1,'Casa histórica',$2,'HISTORICA')",[house,user])
    await db.query('INSERT INTO membros_republica(id,usuario_id,republica_id) VALUES ($1,$2,$3)',[member,user,house])
    await db.query("INSERT INTO despesas(id,republica_id,criada_por_id,titulo,categoria,valor_total,vencimento) VALUES ($1,$2,$3,'Conta anterior','Casa',60,'2026-01-10')",[expense,house,user])
    await db.query('INSERT INTO rateios_despesa(id,despesa_id,membro_id,valor_devido) VALUES ($1,$2,$3,60)',[share,expense,member])
    await db.query('INSERT INTO pagamentos(id,rateio_id,membro_id,valor) VALUES ($1,$2,$3,25)',[payment,share,member])
    await db.query("INSERT INTO comprovantes(pagamento_id,conteudo,mime_type,tamanho,hash_sha256) VALUES ($1,$2,'application/pdf',$3,$4)",[payment,proof,proof.length,createHash('sha256').update(proof).digest('hex')])
    await db.query('COMMIT')
    async function snapshot() {
      const result: Record<string, unknown>={}
      for(const table of ['usuarios','republicas','membros_republica','despesas','rateios_despesa','pagamentos','comprovantes']) result[table]=(await db.query(`SELECT * FROM ${table}`)).rows
      return result
    }
    const before=await snapshot()
    await db.query(await readFile(`prisma/migracoes/${migrations.at(-1)}/migration.sql`,'utf8'))
    assert.deepEqual(await snapshot(),before)
    assert.equal((await db.query('SELECT count(*) FROM recorrencias_despesa')).rows[0].count,'0')
    const row=(await db.query('SELECT valor_devido,valor_pago,status FROM rateios_despesa WHERE id=$1',[share])).rows[0]
    assert.deepEqual(row,{valor_devido:'60.00',valor_pago:'25.00',status:'PARCIAL'})
    assert.deepEqual((await db.query('SELECT conteudo FROM comprovantes WHERE pagamento_id=$1',[payment])).rows[0].conteudo,proof)
  } finally {
    await db.query('ROLLBACK')
    // Somente o schema descartável criado por este teste; nunca limpar dados da equipe.
    await db.query(`DROP SCHEMA "${schema}" CASCADE`)
    await db.end()
  }
})
