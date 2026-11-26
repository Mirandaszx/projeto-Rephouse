import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile, copyFile, unlink } from 'node:fs/promises'
import { resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
process.chdir(root)
const report=resolve('.devops-local/devops/seguranca'), staging=resolve(report,`source-${Date.now()}`)
const versions={gitleaks:'ghcr.io/gitleaks/gitleaks:v8.30.1',semgrep:'semgrep/semgrep:1.185.0',trivy:'aquasec/trivy:0.76.2'}
const results=[]
async function command(program,args,capture=false){
  return new Promise((resolveCommand,reject)=>{
    const child=spawn(process.platform==='win32'?`${program}.exe`:program,args,{cwd:root,windowsHide:true,env:{...process.env,SEMGREP_SEND_METRICS:'off'},stdio:['ignore','pipe','pipe']})
    let out='';child.stdout.on('data',b=>{out+=b;if(!capture)process.stdout.write(b)});child.stderr.on('data',b=>{if(!capture)process.stderr.write(b)})
    child.on('error',reject);child.on('close',code=>resolveCommand({code,out}))
  })
}
async function scan(name,image,args,source=staging){
  console.log(`Verificação: ${name}`)
  const result=await command('docker',['run','--rm','--cpus','1','--memory','768m',
    '-v',`${source}:/source:ro`,'-v',`${report}:/reports`,'-v','rephouse-devops-trivy-cache:/root/.cache/trivy',
    '-e','SEMGREP_SEND_METRICS=off',image,...args])
  results.push({name,code:result.code,image})
}
await mkdir(staging,{recursive:true})
try{
  const listed=await command('git',['ls-files','--cached','--others','--exclude-standard','-z'],true)
  if(listed.code)throw new Error('Não foi possível listar os arquivos candidatos do repositório.')
  for(const file of new Set(listed.out.split('\0').filter(Boolean))){
    const path=resolve(root,file),destination=resolve(staging,file)
    if(relative(root,path).startsWith('..')||relative(staging,destination).startsWith('..'))throw new Error('Caminho fora do repositório.')
    await mkdir(dirname(destination),{recursive:true})
    try{await copyFile(path,destination)}catch(error){if(error.code!=='ENOENT')throw error}
  }
  // .gitleaksignore lista só falsos positivos revisados, por impressão digital (arquivo, regra e linha).
  await scan('segredos-historico',versions.gitleaks,['git','/source','--log-opts=--all','--redact=100','--gitleaks-ignore-path=/source/.gitleaksignore','--report-format=json','--report-path=/reports/gitleaks-history.json'],root)
  await scan('segredos-arquivos',versions.gitleaks,['dir','/source','--redact=100','--gitleaks-ignore-path=/source/.gitleaksignore','--report-format=json','--report-path=/reports/gitleaks-working.json'])
  await scan('sast',versions.semgrep,['semgrep','scan','--config','/source/infra/devops/seguranca/semgrep.yml','--metrics=off','--disable-version-check','--error','--json','--output','/reports/semgrep.json','/source/codigo','/source/interface/codigo'])
  // O relatório público precisa da regra/localização; não precisa de trechos de código.
  try{
    const file=resolve(report,'semgrep.json'), data=JSON.parse(await readFile(file,'utf8'))
    for(const result of data.results??[]){delete result.extra?.lines;delete result.extra?.metavars;delete result.extra?.dataflow_trace}
    // No Linux da CI o contêiner grava o arquivo como root; apagar e recriar só exige permissão na pasta, que é nossa.
    await unlink(file);await writeFile(file,JSON.stringify(data,null,2))
  }catch(error){if(error.code!=='ENOENT')throw error}
  await scan('dependencias',versions.trivy,['fs','--scanners','vuln','--include-dev-deps','--severity','HIGH,CRITICAL','--exit-code','1','--format','json','--output','/reports/trivy-dependencies.json','--skip-dirs','node_modules','/source'])
  const images=JSON.parse(await readFile('.devops-local/devops/imagens.json','utf8')).images
  for(const image of images){
    const tar=resolve(report,`image-${image.name}.tar`)
    try{
      if((await command('docker',['save','-o',tar,image.image])).code)throw new Error('Falha ao exportar imagem para análise.')
      // Relatório completo (inclui falhas ainda sem correção publicada), só informativo.
      await scan(`relatorio-${image.name}`,versions.trivy,['image','--input',`/reports/image-${image.name}.tar`,'--scanners','vuln','--severity','HIGH,CRITICAL','--exit-code','0','--format','json','--output',`/reports/trivy-${image.name}.json`])
      // Critério de reprovação: HIGH/CRITICAL que já têm correção publicada e não foram aplicadas.
      await scan(`imagem-${image.name}`,versions.trivy,['image','--input',`/reports/image-${image.name}.tar`,'--scanners','vuln','--severity','HIGH,CRITICAL','--ignore-unfixed','--ignorefile','/source/.trivyignore.yaml','--exit-code','1','--format','json','--output',`/reports/trivy-${image.name}-corrigiveis.json`])
    }finally{await unlink(tar).catch(error=>{if(error.code!=='ENOENT')throw error})}
  }
}catch(error){console.error(error.message);results.push({name:'execucao',code:1})}
await writeFile(resolve(report,'resultado.json'),JSON.stringify({executedAt:new Date().toISOString(),results},null,2))
console.table(results.map(({name,code})=>({verificacao:name,codigo:code})))
process.exitCode=results.some(r=>r.code!==0)?1:0
