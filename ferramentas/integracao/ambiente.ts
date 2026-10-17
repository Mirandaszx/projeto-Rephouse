import {randomUUID} from 'node:crypto'
import {readFile,readdir} from 'node:fs/promises'
import pg from 'pg'
import {hash,argon2id} from 'argon2'
import {createDatabase} from '../../codigo/infraestrutura/banco/client.js'

export const contasIntegracao={
  adminAurora:'admin.aurora',adminHorizonte:'admin.horizonte',
  ana:'ana',bruno:'bruno',carla:'carla',excluir:'excluir',master:'master',
} as const
export const emailIntegracao=(conta:keyof typeof contasIntegracao)=>`${contasIntegracao[conta]}@integracao.rephouse.test`

export async function abrirAmbienteIntegracao(databaseUrl:string|undefined,senha:string){
  // Nunca recorrer a DATABASE_URL: nem a demonstração pode escrever no banco da equipe.
  if(!databaseUrl||!URL.canParse(databaseUrl)||new URL(databaseUrl).pathname!=='/rabbu_mvp_test')throw new Error('Configure TEST_DATABASE_URL para o banco dedicado rabbu_mvp_test.')
  if(senha.length<12||senha.length>128)throw new Error('Defina DEMO_PASSWORD com 12 a 128 caracteres.')
  const schema=`integration_test_${randomUUID().replaceAll('-','')}`
  const setup=new pg.Client({connectionString:databaseUrl,options:`-c search_path=${schema}`})
  const isolated=new URL(databaseUrl);isolated.searchParams.set('schema',schema)
  const db=createDatabase(isolated.toString())
  let created=false,closed=false
  const close=async()=>{
    if(closed)return
    closed=true
    try{await db.$disconnect()}
    finally{try{if(created)await setup.query(`DROP SCHEMA "${schema}" CASCADE`)}finally{await setup.end()}}
  }
  try{
    await setup.connect()
    await setup.query(`CREATE SCHEMA "${schema}"`);created=true
    for(const name of(await readdir('prisma/migracoes')).filter(name=>/^\d/.test(name)).sort())await setup.query(await readFile(`prisma/migracoes/${name}/migration.sql`,'utf8'))
    const senhaHash=await hash(senha,{type:argon2id})
    for(const conta of Object.keys(contasIntegracao) as (keyof typeof contasIntegracao)[]){
      await db.usuario.create({data:{nome:`Integração ${conta}`,email:emailIntegracao(conta),senhaHash,tipoUsuario:conta==='master'?'USUARIO_MASTER':'USUARIO_NORMAL'}})
    }
    return {db,schema,close}
  }catch(error){await close();throw error}
}
