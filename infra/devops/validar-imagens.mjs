import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'

const local='.devops-local/devops', manifest=JSON.parse(await readFile(`${local}/imagens.json`,'utf8')),checks=[]
function docker(args){const result=spawnSync(process.platform==='win32'?'docker.exe':'docker',args,{encoding:'utf8',windowsHide:true});if(result.status!==0)throw new Error('Verificação isolada da imagem falhou.');return result.stdout}
try{
  for(const image of manifest.images){
    const info=JSON.parse(docker(['image','inspect',image.image]))[0]
    assert.equal(info.Id,image.id);assert.ok(info.Config.User&&!['root','0','0:0'].includes(info.Config.User))
    assert.ok((info.Config.Env??[]).every(value=>! /^(DATABASE_URL|RESEND_API_KEY|BREVO_API_KEY|JWT_SECRET|GOOGLE_CLIENT_ID)=/.test(value)))
    checks.push({name:`${image.name}: digest, usuário limitado e ausência de credenciais na configuração`,passed:true})
  }
  const api=manifest.images.find(x=>x.name==='api').image
  // Imagem distroless: o node é o entrypoint, então os argumentos vão direto para ele.
  const result=JSON.parse(docker(['run','--rm','--network','none','--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=32m',api,'--input-type=module','-e',
    `import sharp from 'sharp';import{existsSync}from'node:fs';if(process.getuid()===0||['/app/.env','/app/copias-seguranca','/app/armazenamento','/app/prisma'].some(existsSync))process.exit(1);const buffer=await sharp({create:{width:20,height:20,channels:3,background:'#205448'}}).resize(512,512).webp().toBuffer();const info=await sharp(buffer).metadata();console.log(JSON.stringify({uid:process.getuid(),format:info.format,width:info.width,height:info.height}))`]))
  assert.equal(result.uid,65532);assert.equal(result.format,'webp');assert.equal(result.width,512)
  checks.push({name:'API executa Sharp sem root, sem rede, com raiz somente leitura e sem arquivos locais',passed:true})
  const front=manifest.images.find(x=>x.name==='frontend').image
  docker(['run','--rm','--network','none','--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=32m','--add-host','api:127.0.0.1','--entrypoint','sh',front,'-c',
    'test "$(id -u)" != 0 && test ! -e /usr/share/nginx/html/.env && test ! -e /usr/share/nginx/html/node_modules && nginx -t'])
  checks.push({name:'Nginx valida configuração sem root, sem rede e sem servidor Vite',passed:true})
}catch(error){checks.push({name:'falha',passed:false,message:error.message});console.error(error.message);process.exitCode=1}
await writeFile(`${local}/validacao-imagens.json`,JSON.stringify({executedAt:new Date().toISOString(),checks},null,2))
for(const check of checks)console.log(`${check.passed?'OK':'FALHA'}: ${check.name}`)
