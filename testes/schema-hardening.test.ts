import 'dotenv/config'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import pg from 'pg'
import { z } from 'zod'
import { abrirSchemaAuditoria, registros } from './auxiliares/schema.js'
import { validarDestinoTestes } from '../ferramentas/integracao/destino-testes.js'

type Context = Awaited<ReturnType<typeof abrirSchemaAuditoria>>
type Write = (c: Context, value: unknown) => Promise<unknown>
const change = (table: string, column: string, id: keyof Context['ids']): Write =>
  (c, value) => c.db.query(`UPDATE ${table} SET ${column}=$1 WHERE id=$2`, [value, c.ids[id]])
const config: (column: string) => Write = column => async (c, value) => {
  const id = randomUUID()
  const fields = ['versao', 'vigencia', 'titulo', 'categoria', 'valor_total', 'dia_vencimento']
  await c.db.query(`INSERT INTO configuracoes_recorrencia(id,recorrencia_id,${fields.join(',')})
    SELECT $1,recorrencia_id,${fields.map(field => field === column ? '$2' : field === 'versao' ? "nextval('configuracoes_recorrencia_versao_seq')" : field).join(',')}
    FROM configuracoes_recorrencia WHERE id=$3`, [id, value, c.ids.config])
  await c.db.query('INSERT INTO recorrencias_participantes VALUES($1,$2)', [id, c.ids.membro])
}
const recurring: (column: string) => Write = column => (c, value) => {
  const fields = ['inicio', 'proxima_competencia', 'pausa_motivo', 'hash_requisicao']
  return c.db.query(`INSERT INTO recorrencias_despesa(republica_id,criada_por_id,chave_idempotencia,${fields.join(',')})
    SELECT republica_id,criada_por_id,gen_random_uuid(),${fields.map(field => field === column ? '$1' : field).join(',')}
    FROM recorrencias_despesa WHERE id=$2`, [value, c.ids.recorrencia])
}
const occurrence: (column: string) => Write = column => (c, value) => {
  const fields = ['competencia', 'motivo', 'revisada_em', 'revisada_por_id']
  const normal: Record<string, string> = { competencia: "'2035-01-01'::date", motivo: 'NULL', revisada_em: 'NULL', revisada_por_id: 'NULL' }
  return c.db.query(`INSERT INTO competencias_recorrencia(recorrencia_id,estado,${fields.join(',')})
    VALUES($1,'PENDENTE_REVISAO',${fields.map(field => field === column ? '$2' : normal[field]).join(',')})`, [c.ids.recorrencia, value])
}
const payment: (column: string) => Write = column => (c, value) => c.db.query(`INSERT INTO pagamentos(rateio_id,membro_id,valor,hash_requisicao)
  VALUES($1,$2,${column === 'valor' ? '$3' : '1'},${column === 'hash_requisicao' ? '$3' : 'NULL'})`, [c.ids.rateio, c.ids.membro, value])
const challenge: Write = (c, value) => c.db.query(`INSERT INTO desafios_google(id,nonce_hash,cookie_hash,finalidade,usuario_id,versao_token,expira_em)
  VALUES(gen_random_uuid(),repeat('a',64),repeat('b',64),'exclusao',$1,$2,now()+interval '5 minutes')`, [c.ids.morador, value])
const sqlState = (expected: string) => (error: unknown) => error instanceof Error && 'code' in error && error.code === expected

async function rolledBack(c: Context, action: () => Promise<unknown>) {
  await c.db.query('BEGIN')
  try { await action(); await c.db.query('SET CONSTRAINTS ALL IMMEDIATE') }
  finally { await c.db.query('ROLLBACK') }
}

const cases: { id: string; write: Write; invalid: unknown; valid: unknown; code?: string }[] = []
for (const [id, table, column, target] of [
  ['C01','usuarios','nome','morador'],['C02','republicas','nome','casa'],['C03','despesas','titulo','despesa'],
  ['C04','despesas','categoria','despesa'],['C05','tarefas','titulo','tarefa'],
] as const) cases.push({ id, write: change(table,column,target), invalid: '\u00a0\ufeff', valid: 'São José 🏡' })
cases.push({id:'C06',write:config('titulo'),invalid:'\u00a0\ufeff',valid:'Água 🏡'}, {id:'C07',write:config('categoria'),invalid:'\u00a0\ufeff',valid:'Água 🏡'})
cases.push({id:'C08',write:change('tarefas','descricao','tarefa'),invalid:'😀'.repeat(2501),valid:'😀'.repeat(2500)},
  {id:'C09',write:change('usuarios','versao_token','morador'),invalid:-1,valid:0}, {id:'C10',write:challenge,invalid:null,valid:0},
  {id:'C11',write:payment('hash_requisicao'),invalid:'A'.repeat(64),valid:'a'.repeat(64)},
  {id:'C12',write:recurring('hash_requisicao'),invalid:'g'.repeat(64),valid:'a'.repeat(64)},
  {id:'C13',write:change('despesas','valor_total','despesa'),invalid:'NaN',valid:'100.00'},
  {id:'C14',write:change('rateios_despesa','valor_devido','rateio'),invalid:'NaN',valid:'100.00'},
  {id:'C15',write:change('rateios_despesa','valor_pago','rateio'),invalid:'NaN',valid:'0.00'},
  // O BEFORE trigger financeiro já rejeita NaN acima do saldo antes do CHECK adicional.
  {id:'C16',write:payment('valor'),invalid:'NaN',valid:'0.01',code:'RH001'},
  {id:'C17',write:config('valor_total'),invalid:'NaN',valid:'0.01'}, {id:'C18',write:config('versao'),invalid:0,valid:100000},
  {id:'C19',write:change('despesas','vencimento','despesa'),invalid:'infinity',valid:'2000-02-29'},
  {id:'C20',write:change('tarefas','prazo','tarefa'),invalid:'-infinity',valid:null},
  {id:'C21',write:recurring('inicio'),invalid:'-infinity',valid:'2030-01-01'},
  {id:'C22',write:recurring('proxima_competencia'),invalid:'infinity',valid:'2030-02-01'},
  {id:'C23',write:config('vigencia'),invalid:'infinity',valid:'2030-01-01'},
  {id:'C24',write:occurrence('competencia'),invalid:'infinity',valid:'2035-01-01'},
  {id:'C25',write:occurrence('revisada_em'),invalid:'2035-01-01T12:00:00Z',valid:null},
  {id:'C26',write:recurring('pausa_motivo'),invalid:'MOTIVO_INVENTADO',valid:'PARTICIPANTES_INATIVOS'},
  {id:'C27',write:occurrence('motivo'),invalid:'MOTIVO_INVENTADO',valid:'PERIODO_NAO_GERADO'},
  {id:'C28',write:change('usuarios','email','morador'),invalid:'nome..sobrenome@exemplo.com',valid:"o'neil+teste@exemplo.com"})
for (const [id, table, column, target, limit] of [
  ['C29','usuarios','nome','morador',120],['C30','republicas','nome','casa',120],['C31','despesas','titulo','despesa',160],
  ['C32','despesas','categoria','despesa',80],['C33','tarefas','titulo','tarefa',160],
  ['C34','configuracoes_recorrencia','titulo','config',160],['C35','configuracoes_recorrencia','categoria','config',80],
  ['C36','republicas','endereco','casa',255],
] as const) cases.push({id,write:target === 'config' ? config(column) : change(table,column,target),invalid:'😀'.repeat(Math.floor(limit/2)+1),valid:'😀'.repeat(Math.floor(limit/2))+(limit%2?'a':'')})

describe('36 regras auditadas: rejeição, limites válidos e rollback', () => {
  for (const item of cases.sort((a,b) => a.id.localeCompare(b.id))) it(`quando viola ${item.id}, então rejeita; quando respeita o limite, então aceita sem perder histórico`, async () => {
    const c = await abrirSchemaAuditoria()
    try {
      const before = await registros(c.db)
      await assert.rejects(rolledBack(c, () => item.write(c, item.invalid)), sqlState(item.code ?? '23514'))
      assert.deepEqual(await registros(c.db), before)
      await rolledBack(c, () => item.write(c, item.valid))
      assert.deepEqual(await registros(c.db), before)
    } finally { await c.close() }
  })
})

describe('Restrições adicionais do schema por SQL real', () => {
  it('quando o nome contém somente espaços ECMAScript, então o banco rejeita sem alterar registros', async () => {
    const c = await abrirSchemaAuditoria()
    try {
      await assert.rejects(c.db.query('UPDATE usuarios SET nome=$1 WHERE id=$2', ['\u00a0\ufeff', c.ids.morador]),
        (error: unknown) => error instanceof Error && 'code' in error && error.code === '23514')
      assert.equal((await c.db.query('SELECT nome FROM usuarios WHERE id=$1', [c.ids.morador])).rows[0].nome, 'Morador fictício')
    } finally { await c.close() }
  })
  it('quando uma escrita SQL tenta bloquear o último MASTER, então rejeita com conflito de domínio', async () => {
    const c = await abrirSchemaAuditoria()
    try {
      await c.db.query("UPDATE usuarios SET tipo_usuario='USUARIO_MASTER' WHERE id=$1", [c.ids.morador])
      await assert.rejects(c.db.query('UPDATE usuarios SET ativo=false WHERE id=$1', [c.ids.morador]),
        (error: unknown) => error instanceof Error && 'code' in error && error.code === 'RH001')
      assert.equal((await c.db.query('SELECT ativo FROM usuarios WHERE id=$1', [c.ids.morador])).rows[0].ativo, true)
    } finally { await c.close() }
  })
})

describe('Compatibilidade, transições e reversão', () => {
  it('quando aplica, reverte e reaplica cada assunto sobre histórico financeiro, então preserva dados, comprovantes e objetos anteriores', async () => {
    const c = await abrirSchemaAuditoria(true)
    async function catalog() {
      const constraints = (await c.db.query(`SELECT c.conname,c.contype,c.convalidated,pg_get_constraintdef(c.oid) definicao
        FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname=current_schema() ORDER BY c.conname,c.contype`)).rows
      const functions = (await c.db.query(`SELECT p.proname,pg_get_functiondef(p.oid) definicao FROM pg_proc p
        JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=current_schema() AND p.prokind='f' ORDER BY p.proname`)).rows
      const indexes = (await c.db.query('SELECT indexname,indexdef FROM pg_indexes WHERE schemaname=current_schema() ORDER BY indexname')).rows
      const triggers = (await c.db.query(`SELECT tgname,pg_get_triggerdef(t.oid) definicao FROM pg_trigger t JOIN pg_class r ON r.oid=t.tgrelid
        JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname=current_schema() AND NOT t.tgisinternal ORDER BY tgname`)).rows
      const views = (await c.db.query('SELECT viewname,definition FROM pg_views WHERE schemaname=current_schema() ORDER BY viewname')).rows
      return { constraints, functions, indexes, triggers, views }
    }
    try {
      const before = await registros(c.db), originalCatalog = await catalog()
      const names = (await readdir('prisma/migracoes')).filter(name => name.startsWith('20261118')).sort()
      assert.equal(names.length,9)
      for (const name of names) {
        const previousCatalog = await catalog()
        const up = await readFile(`prisma/migracoes/${name}/migration.sql`,'utf8'), down = await readFile(`prisma/migracoes/${name}/down.sql`,'utf8')
        await c.db.query(up); assert.deepEqual(await registros(c.db),before)
        assert.equal((await c.db.query(`SELECT count(*)::int n FROM pg_constraint WHERE connamespace=current_schema()::regnamespace AND NOT convalidated`)).rows[0].n,0)
        await c.db.query(down); assert.deepEqual(await registros(c.db),before); assert.deepEqual(await catalog(),previousCatalog)
        await c.db.query(up); assert.deepEqual(await registros(c.db),before)
      }
      assert.equal((await c.db.query(`SELECT count(*)::int n FROM pg_constraint WHERE connamespace=current_schema()::regnamespace AND conname LIKE 'aud_%'`)).rows[0].n,36)
      for (const name of [...names].reverse()) await c.db.query(await readFile(`prisma/migracoes/${name}/down.sql`,'utf8'))
      assert.deepEqual(await catalog(),originalCatalog); assert.deepEqual(await registros(c.db),before)
      for (const name of names) await c.db.query(await readFile(`prisma/migracoes/${name}/migration.sql`,'utf8'))
      assert.deepEqual(await registros(c.db),before)
    } finally { await c.close() }
  })

  it('quando o legado viola uma regra, então a migration interrompe sem corrigir ou remover o registro', async () => {
    const c = await abrirSchemaAuditoria(true)
    try {
      await c.db.query('UPDATE usuarios SET nome=$1 WHERE id=$2',['\u00a0',c.ids.morador])
      const before = await registros(c.db)
      await assert.rejects(c.db.query(await readFile('prisma/migracoes/202611180001_textos/migration.sql','utf8')),sqlState('23514'))
      await c.db.query('ROLLBACK')
      assert.deepEqual(await registros(c.db),before)
      assert.equal((await c.db.query(`SELECT count(*)::int n FROM pg_constraint WHERE connamespace=current_schema()::regnamespace AND conname LIKE 'aud_%'`)).rows[0].n,0)
    } finally { await c.close() }
  })

  it('quando compara a política de e-mail congelada com Zod, então ambos aceitam e rejeitam os casos de fronteira', async () => {
    const c = await abrirSchemaAuditoria()
    try {
      const expression = (await c.db.query(`SELECT pg_get_expr(conbin,conrelid) expressao FROM pg_constraint
        WHERE conrelid='usuarios'::regclass AND conname='aud_usuarios_email_formato'`)).rows[0].expressao as string
      for (const [email, expected] of [
        ['a+b@exemplo.com',true],["o'neil@exemplo.com",true],['_@exemplo.com',true],['nome.sobrenome@sub.exemplo.com',true],
        ['a..b@exemplo.com',false],['.a@exemplo.com',false],['a@b.c',false],['a@-dominio.com',false],
        ['a b@exemplo.com',false],['a@exemplo.123',false],['a@exemplo.com\n',false],
      ] as const) {
        assert.equal(z.email().safeParse(email).success,expected,email)
        assert.equal((await c.db.query(`SELECT ${expression} permitido FROM (SELECT $1::varchar email) dados`,[email])).rows[0].permitido,expected,email)
      }
    } finally { await c.close() }
  })

  it('quando a data da sessão muda, então a view continua usando Brasília inclusive na fronteira da meia-noite', async () => {
    const c = await abrirSchemaAuditoria()
    try {
      const definition = (await c.db.query(`SELECT pg_get_viewdef('despesas_com_status'::regclass,true) definicao`)).rows[0].definicao as string
      assert.match(definition,/America\/Sao_Paulo/); assert.doesNotMatch(definition,/CURRENT_DATE|Fortaleza/)
      for (const timezone of ['UTC','Asia/Tokyo','America/Los_Angeles']) {
        await c.db.query('BEGIN')
        try {
          await c.db.query("SELECT set_config('TimeZone',$1,true)",[timezone])
          await c.db.query(`UPDATE despesas SET vencimento=(now() AT TIME ZONE 'America/Sao_Paulo')::date-1 WHERE id=$1`,[c.ids.despesa])
          assert.equal((await c.db.query('SELECT status_calculado FROM despesas_com_status WHERE id=$1',[c.ids.despesa])).rows[0].status_calculado,'VENCIDA')
          // Avalia a definição real da view com um instante literal; a regra da API não é simulada.
          const fixed = definition.replace(/now\(\)/g,"TIMESTAMPTZ '2030-01-02 01:00:00+00'")
          await c.db.query("UPDATE despesas SET vencimento='2030-01-01' WHERE id=$1",[c.ids.despesa])
          assert.equal((await c.db.query(`SELECT status_calculado FROM (${fixed.replace(/;\s*$/,'')}) v WHERE id=$1`,[c.ids.despesa])).rows[0].status_calculado,'PENDENTE')
        } finally { await c.db.query('ROLLBACK') }
      }
    } finally { await c.close() }
  })

  it('quando completa uma revisão, então preserva o motivo; metadados opcionais e senha Google continuam válidos', async () => {
    const c = await abrirSchemaAuditoria()
    try {
      await rolledBack(c,async () => {
        await occurrence('motivo')(c,'PARTICIPANTES_INATIVOS')
        await c.db.query(`UPDATE competencias_recorrencia SET estado='REVISADA',revisada_em=now(),revisada_por_id=$1 WHERE recorrencia_id=$2`,[c.ids.admin,c.ids.recorrencia])
        assert.equal((await c.db.query('SELECT motivo FROM competencias_recorrencia')).rows[0].motivo,'PARTICIPANTES_INATIVOS')
        await c.db.query('INSERT INTO identidades_google(sub,usuario_id) VALUES($1,$2)',['google-test-sub',c.ids.morador])
        await c.db.query('UPDATE usuarios SET senha_hash=NULL WHERE id=$1',[c.ids.morador])
        await change('tarefas','descricao','tarefa')(c,null)
        await change('republicas','endereco','casa')(c,null)
        await recurring('pausa_motivo')(c,null)
        await payment('hash_requisicao')(c,null)
        await c.db.query(`INSERT INTO desafios_google(id,nonce_hash,cookie_hash,finalidade,expira_em)
          VALUES(gen_random_uuid(),repeat('a',64),repeat('b',64),'login',now()+interval '5 minutes')`)
      })
      await assert.rejects(rolledBack(c,()=>challenge(c,-1)),sqlState('23514'))
      await assert.rejects(rolledBack(c,()=>occurrence('revisada_por_id')(c,c.ids.admin)),sqlState('23514'))
    } finally { await c.close() }
  })

  it('quando exclui uma conta, então não permite limpar ou substituir a data nem reativá-la', async () => {
    const c = await abrirSchemaAuditoria()
    try {
      await c.db.query('UPDATE usuarios SET ativo=false,excluido_em=now() WHERE id=$1',[c.ids.morador])
      const before = await registros(c.db)
      for (const operation of ['excluido_em=NULL',"excluido_em=excluido_em+interval '1 second'",'ativo=true,excluido_em=NULL']) {
        await assert.rejects(c.db.query(`UPDATE usuarios SET ${operation} WHERE id=$1`,[c.ids.morador]),sqlState('RH001'))
        assert.deepEqual(await registros(c.db),before)
      }
    } finally { await c.close() }
  })

  for (const operation of ['ativo=false',"tipo_usuario='USUARIO_NORMAL'",'ativo=false,excluido_em=now()','DELETE']) {
    it(`quando tenta ${operation} no último MASTER, então a transação é revertida`,async()=>{
      const c = await abrirSchemaAuditoria()
      try {
        assert.equal((await c.db.query("SELECT count(*)::int n FROM usuarios WHERE tipo_usuario='USUARIO_MASTER'")).rows[0].n,0)
        await c.db.query("UPDATE usuarios SET tipo_usuario='USUARIO_MASTER' WHERE id=$1",[c.ids.morador])
        const before = await registros(c.db)
        await assert.rejects(c.db.query(operation === 'DELETE' ? 'DELETE FROM usuarios WHERE id=$1' : `UPDATE usuarios SET ${operation} WHERE id=$1`,[c.ids.morador]),sqlState('RH001'))
        assert.deepEqual(await registros(c.db),before)
      } finally { await c.close() }
    })
  }

  for (const primeiro of ['promover','remover'] as const) it(`quando substitui o último MASTER começando por ${primeiro}, então aceita o estado final válido`,async()=>{
    const c = await abrirSchemaAuditoria()
    try {
      await c.db.query("UPDATE usuarios SET tipo_usuario='USUARIO_MASTER' WHERE id=$1",[c.ids.morador])
      const novo = randomUUID()
      await c.db.query(`INSERT INTO usuarios(id,nome,email,senha_hash) SELECT $1,'Novo MASTER','novo@schema.rephouse.test',senha_hash FROM usuarios WHERE id=$2`,[novo,c.ids.morador])
      await c.db.query('BEGIN')
      const promover = () => c.db.query("UPDATE usuarios SET tipo_usuario='USUARIO_MASTER' WHERE id=$1",[novo])
      const remover = () => c.db.query('DELETE FROM usuarios WHERE id=$1',[c.ids.morador])
      if (primeiro === 'promover') {await promover();await remover()} else {await remover();await promover()}
      await c.db.query('COMMIT')
      assert.deepEqual((await c.db.query("SELECT id FROM usuarios WHERE tipo_usuario='USUARIO_MASTER' AND ativo")).rows,[{id:novo}])
    } finally { await c.close() }
  })

  for (const isolation of ['READ COMMITTED','REPEATABLE READ','SERIALIZABLE']) it(`quando os dois últimos MASTERs são bloqueados simultaneamente em ${isolation}, então somente um bloqueio é confirmado`,async()=>{
    const c = await abrirSchemaAuditoria()
    const clients: pg.Client[] = []
    try {
      const ids = [randomUUID(),randomUUID()]
      for (const id of ids) await c.db.query(`INSERT INTO usuarios(id,nome,email,senha_hash,tipo_usuario)
        SELECT $1,'MASTER concorrente',$2,senha_hash,'USUARIO_MASTER' FROM usuarios WHERE id=$3`,[id,`${id}@schema.rephouse.test`,c.ids.morador])
      for (const _ of ids) {
        const client = new pg.Client({connectionString:validarDestinoTestes(process.env.TEST_DATABASE_URL).toString(),options:`-c search_path=${c.schema} -c statement_timeout=10000`})
        clients.push(client);await client.connect();await client.query(`BEGIN ISOLATION LEVEL ${isolation}`)
        // Estabelece os dois snapshots antes das alterações, inclusive em REPEATABLE READ.
        assert.equal((await client.query("SELECT count(*)::int n FROM usuarios WHERE tipo_usuario='USUARIO_MASTER' AND ativo")).rows[0].n,2)
      }
      const results = await Promise.all(clients.map(async(client,index)=>{
        try { await client.query('UPDATE usuarios SET ativo=false WHERE id=$1',[ids[index]]);await client.query('COMMIT');return 'COMMIT' }
        catch(error) {await client.query('ROLLBACK');assert.ok(error instanceof Error && 'code' in error);return String(error.code)}
      }))
      assert.deepEqual(results.sort(),isolation === 'READ COMMITTED' ? ['COMMIT','RH001'] : ['40001','COMMIT'])
      assert.equal((await c.db.query("SELECT count(*)::int n FROM usuarios WHERE tipo_usuario='USUARIO_MASTER' AND ativo")).rows[0].n,1)
    } finally { await Promise.all(clients.map(async client=>{try{await client.query('ROLLBACK')}finally{await client.end()}}));await c.close() }
  })
})
