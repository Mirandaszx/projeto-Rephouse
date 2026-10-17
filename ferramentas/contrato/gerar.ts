import openapiTS,{astToString} from 'openapi-typescript'
import ts from 'typescript'
import {readFile,writeFile} from 'node:fs/promises'
const source=new URL('../../documentacao/openapi.json',import.meta.url)
const target=new URL('../../integracao/api.d.ts',import.meta.url)
const output=astToString(await openapiTS(JSON.parse(await readFile(source,'utf8')),{alphabetize:true,exportType:true,
  transform(schema){if(schema.format==='binary')return ts.factory.createTypeReferenceNode('Blob')},
}))
if(process.argv.includes('--verificar')){
  if((await readFile(target,'utf8')).replaceAll('\r\n','\n')!==output.replaceAll('\r\n','\n'))throw new Error('Tipos desatualizados. Execute npm run api:tipos.')
  console.log('Tipos da integração sincronizados com o OpenAPI.')
}else{await writeFile(target,output);console.log('Tipos gerados em integracao/api.d.ts.')}
