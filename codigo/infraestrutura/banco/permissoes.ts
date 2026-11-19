import type pg from 'pg'

export interface RuntimeRoleOptions { role: string; password: string; schema: string }

export const runtimeTablePrivileges = {
  usuarios: ['SELECT','INSERT','UPDATE'],
  identidades_google: ['SELECT','INSERT'],
  desafios_google: ['SELECT','INSERT','UPDATE','DELETE'],
  republicas: ['SELECT','INSERT','UPDATE'],
  membros_republica: ['SELECT','INSERT','UPDATE'],
  despesas: ['SELECT','INSERT','UPDATE'],
  rateios_despesa: ['SELECT','INSERT','UPDATE','DELETE'],
  pagamentos: ['SELECT','INSERT'],
  comprovantes: ['SELECT','INSERT'],
  tarefas: ['SELECT','INSERT','UPDATE'],
  recorrencias_despesa: ['SELECT','INSERT','UPDATE'],
  configuracoes_recorrencia: ['SELECT','INSERT'],
  recorrencias_participantes: ['SELECT','INSERT'],
  competencias_recorrencia: ['SELECT','INSERT','UPDATE'],
} as const

function identifier(value:string):string {
  if(!/^[a-z_][a-z0-9_]{0,62}$/.test(value))throw new Error('Identificador de provisionamento inválido.')
  return '"'+value+'"'
}

/** Provisionamento administrativo explícito; nunca é executado ao iniciar a API. */
export async function provisionRuntimeRole(client: pg.Client, options: RuntimeRoleOptions): Promise<void> {
  const role=identifier(options.role),schema=identifier(options.schema)
  if(!/^[a-f0-9]{64}$/.test(options.password))throw new Error('A senha técnica deve conter 32 bytes aleatórios em hexadecimal.')
  const database=(await client.query<{name:string}>('SELECT current_database() name')).rows[0]!.name
  const databaseId=identifier(database)
  const marker=`RepHouse runtime: ${database}/${options.schema}`
  await client.query('BEGIN')
  try {
    await client.query("SET LOCAL lock_timeout='2s'")
    await client.query("SET LOCAL statement_timeout='15s'")
    await client.query('SELECT pg_advisory_xact_lock(20261118,2)')
    const existing=(await client.query<{rolsuper:boolean;rolcreatedb:boolean;rolcreaterole:boolean;rolreplication:boolean;rolbypassrls:boolean;marker:string|null}>(
      `SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,shobj_description(oid,'pg_authid') marker FROM pg_roles WHERE rolname=$1`,[options.role])).rows[0]
    if(existing&&(existing.marker!==marker||existing.rolsuper||existing.rolcreatedb||existing.rolcreaterole||existing.rolreplication||existing.rolbypassrls))throw new Error('Role preexistente não pertence a este provisionamento ou possui privilégios administrativos.')
    if((await client.query(`SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname=$1`,[options.role])).rowCount)throw new Error('A conta da API não pode participar de outras roles.')
    if((await client.query(`SELECT 1 FROM pg_shdepend d JOIN pg_roles r ON r.oid=d.refobjid WHERE r.rolname=$1 AND d.deptype='o'`,[options.role])).rowCount)throw new Error('A conta da API não pode ser proprietária de objetos; revise o proprietário antes de reaplicar as permissões.')
    if((await client.query(`SELECT has_schema_privilege('public',$1,'CREATE') allowed`,[options.schema])).rows[0].allowed)throw new Error('O schema permite criação por PUBLIC; revise essa concessão antes de provisionar a API.')
    for(const table of Object.keys(runtimeTablePrivileges)) {
      if(!(await client.query(`SELECT 1 FROM pg_tables WHERE schemaname=$1 AND tablename=$2`,[options.schema,table])).rowCount)throw new Error('Schema incompleto: aplique as migrations aprovadas antes do provisionamento.')
    }
    await client.query("SET LOCAL password_encryption='scram-sha-256'")
    // Senha gerada/validada como hexadecimal: não vem de SQL livre ou de uma requisição HTTP.
    await client.query(`${existing?'ALTER':'CREATE'} ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${options.password}'`)
    // PostgreSQL gera o literal do comentário; credenciais nunca aparecem no retorno ou nos logs.
    const literal=(await client.query<{literal:string}>('SELECT quote_literal($1) literal',[marker])).rows[0]!.literal
    await client.query(`COMMENT ON ROLE ${role} IS ${literal}`)
    await client.query(`REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA ${schema} FROM ${role}`)
    await client.query(`REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ${schema} FROM ${role}`)
    await client.query(`REVOKE ALL PRIVILEGES ON SCHEMA ${schema} FROM ${role}`)
    await client.query(`REVOKE CREATE ON DATABASE ${databaseId} FROM ${role}`)
    await client.query(`GRANT CONNECT ON DATABASE ${databaseId} TO ${role}`)
    await client.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}`)
    for(const[table,privileges]of Object.entries(runtimeTablePrivileges))await client.query(`GRANT ${privileges.join(',')} ON TABLE ${schema}.${identifier(table)} TO ${role}`)
    const sequence=(await client.query<{name:string}>(`SELECT pg_get_serial_sequence($1,'versao') name`,[`${options.schema}.configuracoes_recorrencia`])).rows[0]?.name
    if(!sequence)throw new Error('Sequência de configuração não encontrada.')
    const sequenceId=sequence.split('.').map(part=>identifier(part.replaceAll('"',''))).join('.')
    await client.query(`GRANT USAGE ON SEQUENCE ${sequenceId} TO ${role}`)
    await client.query('COMMIT')
  }catch(error){await client.query('ROLLBACK');throw error}
}
