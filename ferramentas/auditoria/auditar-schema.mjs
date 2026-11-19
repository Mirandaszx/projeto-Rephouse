import pg from 'pg'
import { parse } from 'dotenv'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'

// Auditoria da base LOCAL de desenvolvimento: não executar DDL, migrations ou mutações.
const env = parse(await readFile('.env', 'utf8'))
const url = new URL(env.DATABASE_URL)
if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1'].includes(url.hostname)
  || (url.port || '5432') !== '5432' || url.pathname !== '/rabbu_mvp'
  || (url.searchParams.get('schema') ?? 'public') !== 'public' || env.NODE_ENV === 'production'
  || [...url.searchParams.keys()].some(key => key !== 'schema')) throw new Error('Auditoria restrita ao banco local de desenvolvimento rabbu_mvp/public.')

const ws = [9, 10, 11, 12, 13, 32, 160, 5760, ...Array.from({ length: 11 }, (_, i) => 8192 + i), 8232, 8233, 8239, 8287, 12288, 65279]
const trimChars = ws.map(code => `chr(${code})`).join(' || ')
// JS/HTML contam unidades UTF-16; char_length do PostgreSQL conta pontos de código.
const utf16Length = column => `(char_length(${column}) + char_length(regexp_replace(${column}, U&'[^\\+010000-\\+10FFFF]', '', 'g')))`
const rules = []
function rule(id, tabela, regra, filtro, origem, tipo = 'CHECK') {
  rules.push({ id, tabela, regra, tipo, origem, sql: `SELECT count(*)::integer AS violacoes FROM public.${tabela} WHERE ${filtro}` })
}
for (const [id, table, column, source] of [
  ['C01', 'usuarios', 'nome', 'validation.ts: name; Auth.tsx/Profile.tsx'],
  ['C02', 'republicas', 'nome', 'republicas.controller.ts: name; HouseSettings.tsx'],
  ['C03', 'despesas', 'titulo', 'financeiro.controller.ts: trim/min(1); Republica.tsx'],
  ['C04', 'despesas', 'categoria', 'financeiro.controller.ts: trim/min(1); ExpenseDetails.tsx'],
  ['C05', 'tarefas', 'titulo', 'tarefas.controller.ts: trim/min(1); novo/Tasks.tsx'],
  ['C06', 'configuracoes_recorrencia', 'titulo', 'recorrencias.routes.ts: trim/min(1); RecurringExpenses.tsx'],
  ['C07', 'configuracoes_recorrencia', 'categoria', 'recorrencias.routes.ts: trim/min(1); RecurringExpenses.tsx'],
]) rule(id, table, `${column}: ao menos um caractere após o trim ECMAScript`, `btrim(${column}, ${trimChars}) = ''`, source)
rule('C08', 'tarefas', 'descricao: até 5000 unidades UTF-16, mantendo NULL permitido', `descricao IS NOT NULL AND ${utf16Length('descricao')} > 5000`, 'tarefas.controller.ts; novo/Tasks.tsx maxLength=5000')
rule('C09', 'usuarios', 'versao_token não negativa', 'versao_token < 0', 'auth.service.ts: JWT ver inteiro não negativo')
rule('C10', 'desafios_google', 'finalidade exclusao exige versao_token explicitamente não nula e não negativa', "finalidade = 'exclusao' AND (versao_token IS NULL OR versao_token < 0)", 'google.service.ts: actor.versaoToken; CHECK atual pode resultar em NULL')
rule('C11', 'pagamentos', 'hash_requisicao: NULL legado ou SHA-256 hexadecimal minúsculo', "hash_requisicao IS NOT NULL AND hash_requisicao !~ '^[a-f0-9]{64}$'", 'financeiro.service.ts: createHash; históricos continuam opcionais')
rule('C12', 'recorrencias_despesa', 'hash_requisicao: SHA-256 hexadecimal minúsculo', "hash_requisicao !~ '^[a-f0-9]{64}$'", 'recorrencias.service.ts: createHash')
for (const [id, table, column] of [
  ['C13', 'despesas', 'valor_total'], ['C14', 'rateios_despesa', 'valor_devido'], ['C15', 'rateios_despesa', 'valor_pago'],
  ['C16', 'pagamentos', 'valor'], ['C17', 'configuracoes_recorrencia', 'valor_total'],
]) rule(id, table, `${column}: número finito, sem NaN`, `${column}::text IN ('NaN', 'Infinity', '-Infinity')`, 'money/rateio: valor decimal finito; numeric permite NaN')
rule('C18', 'configuracoes_recorrencia', 'versao positiva', 'versao <= 0', 'recorrencias.repository.ts: sequência de versões de configuração')
for (const [id, table, column] of [
  ['C19', 'despesas', 'vencimento'], ['C20', 'tarefas', 'prazo'], ['C21', 'recorrencias_despesa', 'inicio'],
  ['C22', 'recorrencias_despesa', 'proxima_competencia'], ['C23', 'configuracoes_recorrencia', 'vigencia'], ['C24', 'competencias_recorrencia', 'competencia'],
]) rule(id, table, `${column}: data finita, preservando a nulabilidade atual`, `${column} IS NOT NULL AND NOT isfinite(${column})`, 'dateOnly/competenciaSchema: datas civis finitas')
rule('C25', 'competencias_recorrencia', 'revisada_em e revisada_por_id preenchidos ou ausentes juntos', '(revisada_em IS NULL) <> (revisada_por_id IS NULL)', 'recorrencias.service.ts: review grava os dois campos juntos')
rule('C26', 'recorrencias_despesa', 'pausa_motivo limitado aos motivos emitidos pelo gerador', "pausa_motivo IS NOT NULL AND pausa_motivo NOT IN ('PARTICIPANTES_INATIVOS','REPUBLICA_OU_ADMIN_INATIVO')", 'recorrencias.service.ts: materializeRecurring')
rule('C27', 'competencias_recorrencia', 'motivo limitado aos motivos emitidos pelo gerador, inclusive após revisão', "motivo IS NOT NULL AND motivo NOT IN ('PERIODO_NAO_GERADO','PARTICIPANTES_INATIVOS','REPUBLICA_OU_ADMIN_INATIVO')", 'recorrencias.service.ts: materializeRecurring/review')
const emailPattern = z.regexes.email.source.replaceAll("'", "''")
rule('C28', 'usuarios', 'email compatível com a expressão de z.email() instalada', `email !~ '${emailPattern}'`, 'validation.ts / google.verifier.ts: Zod; regex congelada nesta auditoria, sem alegação de RFC completo')
for (const [id, table, column, limit] of [
  ['C29', 'usuarios', 'nome', 120], ['C30', 'republicas', 'nome', 120], ['C31', 'despesas', 'titulo', 160],
  ['C32', 'despesas', 'categoria', 80], ['C33', 'tarefas', 'titulo', 160], ['C34', 'configuracoes_recorrencia', 'titulo', 160],
  ['C35', 'configuracoes_recorrencia', 'categoria', 80], ['C36', 'republicas', 'endereco', 255],
]) rule(id, table, `${column}: até ${limit} unidades UTF-16, sem restringir acentos`, `${column} IS NOT NULL AND ${utf16Length(column)} > ${limit}`, 'Zod max()/maxlength HTML; varchar limita pontos de código, não UTF-16')

const diagnostics = [
  ['D01', 'rateios de outra república', 'SELECT count(*)::integer AS violacoes FROM public.rateios_despesa rd JOIN public.despesas d ON d.id=rd.despesa_id JOIN public.membros_republica m ON m.id=rd.membro_id WHERE d.republica_id<>m.republica_id'],
  ['D02', 'pagamento de membro diferente do rateio', 'SELECT count(*)::integer AS violacoes FROM public.pagamentos p JOIN public.rateios_despesa r ON r.id=p.rateio_id WHERE p.membro_id<>r.membro_id'],
  ['D03', 'tarefa e responsável de repúblicas diferentes', 'SELECT count(*)::integer AS violacoes FROM public.tarefas t JOIN public.membros_republica m ON m.id=t.responsavel_id WHERE t.republica_id<>m.republica_id'],
  ['D04', 'despesa sem rateios, soma divergente ou divisão desigual', 'SELECT count(*)::integer AS violacoes FROM public.despesas d LEFT JOIN LATERAL (SELECT count(*) n, sum(valor_devido) total, max(valor_devido)-min(valor_devido) diferenca FROM public.rateios_despesa r WHERE r.despesa_id=d.id) s ON true WHERE s.n=0 OR s.total IS DISTINCT FROM d.valor_total OR s.diferenca>0.01'],
  ['D05', 'valor_pago divergente da soma dos pagamentos', 'SELECT count(*)::integer AS violacoes FROM public.rateios_despesa r WHERE r.valor_pago IS DISTINCT FROM (SELECT coalesce(sum(p.valor),0) FROM public.pagamentos p WHERE p.rateio_id=r.id)'],
  ['D06', 'status da despesa divergente das parcelas', "SELECT count(*)::integer AS violacoes FROM public.despesas d WHERE (d.status='PAGA') IS DISTINCT FROM NOT EXISTS (SELECT 1 FROM public.rateios_despesa r WHERE r.despesa_id=d.id AND r.status<>'PAGO')"],
  ['D07', 'usuário com mais de um vínculo ativo (linhas excedentes)', 'SELECT coalesce(sum(n-1),0)::integer AS violacoes FROM (SELECT count(*) n FROM public.membros_republica WHERE ativo GROUP BY usuario_id HAVING count(*)>1) x'],
  ['D08', 'conta sem senha e sem identidade Google', 'SELECT count(*)::integer AS violacoes FROM public.usuarios u WHERE u.senha_hash IS NULL AND NOT EXISTS (SELECT 1 FROM public.identidades_google g WHERE g.usuario_id=u.id)'],
  ['D09', 'administrador sem perfil ou vínculo coerente (ativo da conta não é exigido aqui)', "SELECT count(*)::integer AS violacoes FROM public.republicas r JOIN public.usuarios u ON u.id=r.admin_id WHERE u.tipo_usuario NOT IN ('USUARIO_ADMIN','USUARIO_MASTER') OR NOT EXISTS (SELECT 1 FROM public.membros_republica m WHERE m.usuario_id=u.id AND m.republica_id=r.id AND m.ativo)"],
  ['D10', 'excluído com dívida, administração ou vínculo ativo', 'SELECT count(*)::integer AS violacoes FROM public.usuarios u WHERE u.excluido_em IS NOT NULL AND (u.ativo OR EXISTS(SELECT 1 FROM public.republicas r WHERE r.admin_id=u.id) OR EXISTS(SELECT 1 FROM public.membros_republica m WHERE m.usuario_id=u.id AND m.ativo) OR EXISTS(SELECT 1 FROM public.rateios_despesa r JOIN public.membros_republica m ON m.id=r.membro_id WHERE m.usuario_id=u.id AND r.valor_pago<r.valor_devido))'],
  ['D11', 'configuração recorrente sem participantes ou sem um centavo por participante', 'SELECT count(*)::integer AS violacoes FROM public.configuracoes_recorrencia c LEFT JOIN LATERAL(SELECT count(*) n FROM public.recorrencias_participantes p WHERE p.configuracao_id=c.id) s ON true WHERE s.n=0 OR c.valor_total<s.n*0.01'],
  ['D12', 'participante recorrente de outra república (inatividade histórica é permitida)', 'SELECT count(*)::integer AS violacoes FROM public.recorrencias_participantes p JOIN public.configuracoes_recorrencia c ON c.id=p.configuracao_id JOIN public.recorrencias_despesa r ON r.id=c.recorrencia_id JOIN public.membros_republica m ON m.id=p.membro_id WHERE r.republica_id<>m.republica_id'],
  ['D13', 'comprovante com tamanho, hash ou MIME incoerente', "SELECT count(*)::integer AS violacoes FROM public.comprovantes WHERE tamanho NOT BETWEEN 1 AND 5242880 OR tamanho<>octet_length(conteudo) OR hash_sha256<>encode(sha256(conteudo),'hex') OR mime_type NOT IN ('application/pdf','image/png','image/jpeg','image/webp')"],
  ['D14', 'pagamento legado sem hash (não é violação: preservar NULL)', 'SELECT count(*)::integer AS quantidade FROM public.pagamentos WHERE hash_requisicao IS NULL'],
  ['D15', 'referência legada de comprovante sem conteúdo importado', 'SELECT count(*)::integer AS quantidade FROM public.pagamentos p WHERE p.comprovante_url IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.comprovantes c WHERE c.pagamento_id=p.id)'],
  ['D16', 'MASTER ativos (zero não é violação do fluxo inicial; regra de último MASTER é transicional)', "SELECT count(*)::integer AS quantidade FROM public.usuarios WHERE tipo_usuario='USUARIO_MASTER' AND ativo AND excluido_em IS NULL"],
  ['D17', 'contas atualmente excluídas (não revela reativações passadas)', 'SELECT count(*)::integer AS quantidade FROM public.usuarios WHERE excluido_em IS NOT NULL'],
  ['D18', 'view de vencimento divergente da data de Brasília nesta leitura', "SELECT count(*)::integer AS violacoes FROM public.despesas_com_status v JOIN public.despesas d ON d.id=v.id WHERE v.status_calculado IS DISTINCT FROM CASE WHEN d.status='PAGA' THEN 'PAGA' WHEN d.vencimento < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date THEN 'VENCIDA' ELSE 'PENDENTE' END"],
]
const quote = value => '"' + value.replaceAll('"', '""') + '"'
const db = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000, application_name: 'rephouse_auditoria_somente_leitura' })
const queries = []
async function select(label, sql) { queries.push(`-- ${label}\n${sql};`); return (await db.query(sql)).rows }
let report
try {
  await db.connect()
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
  await db.query("SET LOCAL statement_timeout = '15s'")
  await db.query("SET LOCAL lock_timeout = '2s'")
  const [identity] = await select('Identidade do ambiente, sem credenciais', "SELECT current_database() banco, current_schema() schema, current_setting('server_version') versao, current_setting('TimeZone') fuso_sessao, current_setting('transaction_read_only') somente_leitura, current_setting('transaction_isolation') isolamento, current_timestamp instante")
  if (identity.banco !== 'rabbu_mvp' || identity.schema !== 'public' || identity.somente_leitura !== 'on') throw new Error('Destino ou proteção de leitura divergente.')
  const columns = await select('Todas as colunas físicas', "SELECT c.relname tabela, a.attnum ordem, a.attname coluna, format_type(a.atttypid,a.atttypmod) tipo, NOT a.attnotnull aceita_null, pg_get_expr(d.adbin,d.adrelid) padrao FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname,a.attnum")
  const constraints = await select('Constraints existentes e validação', "SELECT c.relname tabela, con.conname nome, con.contype tipo, con.convalidated validada, con.condeferrable adiavel, pg_get_constraintdef(con.oid) definicao FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,con.conname")
  const indexes = await select('Índices, inclusive unicidade parcial', "SELECT tablename tabela,indexname nome,indexdef definicao FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname")
  const triggers = await select('Triggers não internas', "SELECT c.relname tabela,t.tgname nome,t.tgenabled habilitada,pg_get_triggerdef(t.oid) definicao FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname")
  const functions = await select('Funções de integridade', "SELECT p.proname nome,pg_get_functiondef(p.oid) definicao FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prorettype='trigger'::regtype ORDER BY p.proname")
  const fks = await select('Todas as FKs, por coluna e alvo', "SELECT c.relname tabela,con.conname nome,a.attname coluna,ref.relname tabela_alvo,ra.attname coluna_alvo,con.convalidated validada FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_class ref ON ref.oid=con.confrelid CROSS JOIN LATERAL unnest(con.conkey,con.confkey) AS keys(src,dst) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=keys.src JOIN pg_attribute ra ON ra.attrelid=ref.oid AND ra.attnum=keys.dst WHERE n.nspname='public' AND con.contype='f' ORDER BY c.relname,a.attname")
  const enumTypes = await select('Domínios enum', "SELECT t.typname nome,array_agg(e.enumlabel::text ORDER BY e.enumsortorder) valores FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' GROUP BY t.typname ORDER BY t.typname")
  const tables = []
  for (const table of [...new Set(columns.map(column => column.tabela))]) {
    const [count] = await select(`Linhas atuais: ${table}`, `SELECT count(*)::integer quantidade FROM public.${quote(table)}`)
    tables.push({ tabela: table, linhas: count.quantidade, aplicacao: table !== '_prisma_migrations' })
  }
  const checks = []
  for (const candidate of rules) { const [result] = await select(`${candidate.id}: ${candidate.regra}`, candidate.sql); checks.push({ ...candidate, ...result }) }
  const diagnosis = []
  for (const [id, regra, sql] of diagnostics) { const [result] = await select(`${id}: ${regra}`, sql); diagnosis.push({ id, regra, sql, ...result }) }
  const orphanChecks = []
  for (const fk of fks) {
    const sql = `SELECT count(*)::integer AS violacoes FROM public.${quote(fk.tabela)} t LEFT JOIN public.${quote(fk.tabela_alvo)} r ON t.${quote(fk.coluna)}=r.${quote(fk.coluna_alvo)} WHERE t.${quote(fk.coluna)} IS NOT NULL AND r.${quote(fk.coluna_alvo)} IS NULL`
    const [result] = await select(`Órfãos: ${fk.nome}`, sql); orphanChecks.push({ ...fk, sql, ...result })
  }
  const missingFks = columns.filter(column => column.tabela !== '_prisma_migrations' && column.coluna.endsWith('_id')
    && !fks.some(fk => fk.tabela === column.tabela && fk.coluna === column.coluna))
  const views = await select('Views existentes', "SELECT viewname nome,definition definicao FROM pg_views WHERE schemaname='public' ORDER BY viewname")
  const nullCounts = []
  for (const table of tables) {
    const selected = columns.filter(column => column.tabela === table.tabela)
    const [counts] = await select(`NULL por coluna: ${table.tabela}`, `SELECT ${selected.map(column => `count(*) FILTER (WHERE ${quote(column.coluna)} IS NULL)::integer AS ${quote(column.coluna)}`).join(',')} FROM public.${quote(table.tabela)}`)
    for (const column of selected) nullCounts.push({ tabela: column.tabela, coluna: column.coluna, obrigatoria: !column.aceita_null, nulos: counts[column.coluna] })
  }
  const applied = await select('Migrations aplicadas (sem logs internos)', 'SELECT migration_name nome,checksum,finished_at aplicada_em,rolled_back_at revertida_em FROM public._prisma_migrations ORDER BY migration_name')
  for (const migration of applied) {
    const local = await readFile(`prisma/migracoes/${migration.nome}/migration.sql`)
    migration.checksumLocalConfere = createHash('sha256').update(local).digest('hex') === migration.checksum
  }
  const [demonstration] = await select('Expressões puras: NULL em CHECK, numeric NaN e UTF-16, sem inserir dados', `SELECT (NULL::integer >= 0) IS NULL AS comparacao_nula, 'NaN'::numeric(12,2) > 0 AS nan_maior_que_zero, char_length('😀') AS pontos_codigo_emoji, ${utf16Length("'😀'")} AS unidades_utf16_emoji`)
  const [timeExample] = await select('Exemplo fixo da fronteira de data civil, sem alterar o relógio', "SELECT ('2030-01-02 01:00:00+00'::timestamptz AT TIME ZONE 'UTC')::date data_utc, ('2030-01-02 01:00:00+00'::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date data_brasilia")
  const [role] = await select('Privilégios da conexão atual (sem senhas)', 'SELECT rolsuper superusuario,rolbypassrls ignora_rls FROM pg_roles WHERE rolname=current_user')
  await db.query('ROLLBACK')
  report = { executadoEm: new Date().toISOString(), ambiente: 'desenvolvimento local', apiVerificada: { NODE_ENV: 'development', projetoDocker: 'projeto-rephouse' },
    ...identity, destino: { host: url.hostname, porta: url.port || '5432' },
    tabelas: tables, colunas: columns, enums: enumTypes, constraints, indices: indexes, triggers, funcoes: functions, fks, referenciasSemFk: missingFks,
    contagensPreflight: checks, diagnosticos: diagnosis, orfaos: orphanChecks, contagensNull: nullCounts, migrationsAplicadas: applied, demonstracaoExpressoes: demonstration,
    exemploFronteiraFuso: timeExample, privilegiosConexao: role, views, alteracoesNoBanco: false, migrationsCriadas: false }
} finally { await db.end() }
const directory = 'documentacao/auditoria-schema'
await mkdir(directory, { recursive: true })
await writeFile(`${directory}/resultado.json`, JSON.stringify(report, null, 2) + '\n')
await writeFile(`${directory}/consultas.sql`, '-- Auditoria somente de leitura. Não é uma migration.\nBEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\nSET LOCAL statement_timeout = \'15s\';\nSET LOCAL lock_timeout = \'2s\';\n\n' + queries.join('\n\n') + '\n\nROLLBACK;\n')
console.log(JSON.stringify({ ambiente: report.ambiente, banco: report.banco, somenteLeitura: report.somente_leitura,
  tabelas: report.tabelas, fks: report.fks.length, referenciasSemFk: report.referenciasSemFk,
  preflight: report.contagensPreflight.map(({ id, regra, violacoes }) => ({ id, regra, violacoes })), diagnosticos: report.diagnosticos.map(({ id, regra, violacoes, quantidade }) => ({ id, regra, violacoes, quantidade })) }, null, 2))
