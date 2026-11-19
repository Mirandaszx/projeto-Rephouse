import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import pg from 'pg'
import { validarDestinoTestes } from '../../ferramentas/integracao/destino-testes.js'

/** SQL é a fronteira pública destas regras: sem desabilitar triggers ou simular o banco. */
export async function abrirSchemaAuditoria(somenteAnteriores = false) {
  const url = validarDestinoTestes(process.env.TEST_DATABASE_URL)
  const schema = `schema_test_${randomUUID().replaceAll('-', '')}`
  const db = new pg.Client({ connectionString: url.toString(), options: `-c search_path=${schema}` })
  let criado = false
  async function close() {
    try { await db.query('ROLLBACK'); if (criado) await db.query(`DROP SCHEMA "${schema}" CASCADE`) }
    finally { await db.end() }
  }
  try {
    await db.connect()
    const identity = (await db.query('SELECT current_database() banco, current_user usuario')).rows[0]
    assert.equal(identity.banco, 'rabbu_mvp_test'); assert.equal(identity.usuario, decodeURIComponent(url.username))
    await db.query(`CREATE SCHEMA "${schema}"`); criado = true
    const migrations = (await readdir('prisma/migracoes')).filter(name => /^\d/.test(name)).sort()
    for (const name of migrations) {
      if (somenteAnteriores && name >= '202611180001') continue
      await db.query(await readFile(`prisma/migracoes/${name}/migration.sql`, 'utf8'))
    }
    const ids = Object.fromEntries(['admin', 'morador', 'casa', 'membro', 'despesa', 'rateio', 'paga', 'rateioPago', 'pagamento', 'tarefa', 'recorrencia', 'config'].map(key => [key, randomUUID()])) as Record<'admin'|'morador'|'casa'|'membro'|'despesa'|'rateio'|'paga'|'rateioPago'|'pagamento'|'tarefa'|'recorrencia'|'config', string>
    await db.query('BEGIN')
    await db.query(`INSERT INTO usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES
      ($1,'Administrador fictício','admin@schema.rephouse.test','$argon2id$v=19$m=65536,t=3,p=1$fixtureSalt$fixtureHashOnlyForDatabaseTests','USUARIO_ADMIN'),
      ($2,'Morador fictício','morador@schema.rephouse.test','$argon2id$v=19$m=65536,t=3,p=1$fixtureSalt$fixtureHashOnlyForDatabaseTests','USUARIO_NORMAL')`, [ids.admin, ids.morador])
    await db.query(`INSERT INTO republicas(id,nome,codigo_entrada,admin_id) VALUES($1,'Casa SQL','CASASCHEMA1234567',$2)`, [ids.casa, ids.admin])
    await db.query('INSERT INTO membros_republica(id,usuario_id,republica_id) VALUES($1,$2,$3)', [ids.membro, ids.admin, ids.casa])
    for (const [despesa, rateio] of [[ids.despesa, ids.rateio], [ids.paga, ids.rateioPago]]) {
      await db.query(`INSERT INTO despesas(id,republica_id,criada_por_id,titulo,categoria,valor_total,vencimento) VALUES($1,$2,$3,'Internet','Casa',100,'2030-01-31')`, [despesa, ids.casa, ids.admin])
      await db.query('INSERT INTO rateios_despesa(id,despesa_id,membro_id,valor_devido) VALUES($1,$2,$3,100)', [rateio, despesa, ids.membro])
    }
    await db.query('INSERT INTO pagamentos(id,rateio_id,membro_id,valor) VALUES($1,$2,$3,25)', [ids.pagamento, ids.rateioPago, ids.membro])
    const bytes = Buffer.from('%PDF-1.4\nprova preservada\n%%EOF')
    await db.query(`INSERT INTO comprovantes(pagamento_id,conteudo,mime_type,tamanho,hash_sha256) VALUES($1,$2,'application/pdf',octet_length($2::bytea),encode(sha256($2::bytea),'hex'))`, [ids.pagamento, bytes])
    await db.query(`INSERT INTO tarefas(id,republica_id,responsavel_id,titulo) VALUES($1,$2,$3,'Limpar cozinha')`, [ids.tarefa, ids.casa, ids.membro])
    await db.query(`INSERT INTO recorrencias_despesa(id,republica_id,criada_por_id,inicio,proxima_competencia,chave_idempotencia,hash_requisicao) VALUES($1,$2,$3,'2030-01-01','2030-02-01',gen_random_uuid(),repeat('a',64))`, [ids.recorrencia, ids.casa, ids.admin])
    await db.query(`INSERT INTO configuracoes_recorrencia(id,recorrencia_id,vigencia,titulo,categoria,valor_total,dia_vencimento) VALUES($1,$2,'2030-01-01','Internet','Casa',100,31)`, [ids.config, ids.recorrencia])
    await db.query('INSERT INTO recorrencias_participantes(configuracao_id,membro_id) VALUES($1,$2)', [ids.config, ids.membro])
    await db.query('COMMIT')
    return { db, schema, ids, close }
  } catch (error) { await close(); throw error }
}

export async function registros(db: pg.Client) {
  const tables = (await db.query(`SELECT tablename FROM pg_tables WHERE schemaname=current_schema() ORDER BY tablename`)).rows as { tablename: string }[]
  const result: Record<string, unknown> = {}
  for (const { tablename } of tables) result[tablename] = (await db.query(`SELECT to_jsonb(t) linha FROM "${tablename}" t ORDER BY to_jsonb(t)::text`)).rows
  return result
}
