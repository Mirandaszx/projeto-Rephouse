import {createHash,randomUUID} from 'node:crypto'
import {mkdir,readdir,readFile,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {compose,command,root,sha256,type Stack} from './operacao-docker.js'

// Fixture exclusiva do ensaio: reproduz o schema anterior sem alterar migrations existentes.
export async function legacyBackupFixture(s:Stack,directory:string,password:string){
  await mkdir(directory,{recursive:true})
  await compose(s,['up','-d','--wait','postgres'])
  const sql=(input:string)=>compose(s,['exec','-T','postgres','sh','-c','exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At'],{input})
  await sql('CREATE TABLE _prisma_migrations (id varchar(36) PRIMARY KEY, checksum varchar(64) NOT NULL, finished_at timestamptz, migration_name varchar(255) NOT NULL, logs text, rolled_back_at timestamptz, started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count integer NOT NULL DEFAULT 0);')
  for(const name of(await readdir(join(root,'prisma/migracoes'))).filter(name=>/^\d/.test(name)&&name<'202610170008').sort()){
    const body=await readFile(join(root,'prisma/migracoes',name,'migration.sql'),'utf8')
    await sql(body)
    await sql(`INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name,applied_steps_count) VALUES ('${randomUUID()}','${createHash('sha256').update(body).digest('hex')}',now(),'${name}',1);`)
  }
  s.env.DEMO_PASSWORD=password
  await compose(s,['run','--rm','--no-deps','-T','-e','NODE_ENV=test','-e','DEMO_PASSWORD','api','node','dist/comandos/semear-demonstracao.js'])
  const paymentId=randomUUID(),name=`${randomUUID()}.pdf`,content='%PDF-1.4\nFixture de backup legado\n%%EOF'
  const share='de000000-0000-4000-8000-000500000002',member='de000000-0000-4000-8000-000300000002'
  const hash=createHash('sha256').update(content).digest('hex')
  const requestHash=createHash('sha256').update(JSON.stringify(['de000000-0000-4000-8000-000100000004',share,'0.01',hash])).digest('hex')
  await sql(`INSERT INTO pagamentos(id,rateio_id,membro_id,valor,comprovante_url,hash_requisicao) VALUES ('${paymentId}','${share}','${member}',0.01,'${name}','${requestHash}');`)
  const volume=s.project+'_fixture_legada'
  if(await command(['volume','ls','-q','--filter','name=^'+volume+'$']))throw new Error('Volume de fixture deve ser novo.')
  await command(['volume','create',volume])
  try{
    await compose(s,['run','--rm','--no-deps','-T','--user','0','--volume',volume+':/legacy','--entrypoint','sh','api','-c',`cat > /legacy/${name}`],{input:content})
    await compose(s,['exec','-T','postgres','sh','-c','exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --create'],{output:join(directory,'banco.dump')})
    await compose(s,['run','--rm','--no-deps','-T','--user','0','--volume',volume+':/legacy:ro','--entrypoint','tar','api','-C','/legacy','-czf','-','.'],{output:join(directory,'comprovantes.tar.gz')})
    const revision=await command(['image','inspect','--format','{{.Id}}','rephouse-backend:local'])
    const manifest={format:1,createdAt:new Date().toISOString(),applicationVersion:'2.0.0',revision,project:s.project,database:s.env.BACKEND_DB_NAME,user:s.env.BACKEND_DB_USER,timeZone:'America/Sao_Paulo',files:{'banco.dump':await sha256(join(directory,'banco.dump')),'comprovantes.tar.gz':await sha256(join(directory,'comprovantes.tar.gz'))}}
    await writeFile(join(directory,'manifesto.json'),JSON.stringify(manifest,null,2))
  }finally{await command(['volume','rm',volume])}
  return {paymentId,hash,email:'ana@demo.rephouse.test'}
}
