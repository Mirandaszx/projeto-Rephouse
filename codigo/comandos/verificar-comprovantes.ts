import 'dotenv/config'
import {createDatabase} from '../infraestrutura/banco/client.js'
import {receiptInventory} from '../infraestrutura/armazenamento/importar-comprovantes.js'

const db=createDatabase()
try{
  const inventory=await receiptInventory(db)
  console.log(JSON.stringify(inventory,null,2))
  if(inventory.invalidos||inventory.referenciasLegadasPendentes)process.exitCode=1
}catch{console.error('Não foi possível conferir os comprovantes. Confira a conexão e as migrations do banco.');process.exitCode=1}
finally{await db.$disconnect()}
