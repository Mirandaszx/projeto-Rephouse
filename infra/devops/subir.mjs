// Sobe a demonstração do zero, num comando: abre o Docker Desktop se estiver fechado, espera o motor e o
// Kubernetes, espera a demo e a observabilidade ficarem prontas e libera o acesso (5180 e Kibana).
// Uso: npm run demo:subir (liga) e npm run demo:parar (desliga sem apagar dados, para não confundir com o
// ambiente principal em localhost:5173). Não constrói nem implanta nada: para isso, operar.mjs build e implantar.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const contexto = 'docker-desktop'
const esperar = ms => new Promise(resolve => setTimeout(resolve, ms))
const exe = nome => process.platform === 'win32' ? `${nome}.exe` : nome

function rodar(programa, args, { silencioso = true } = {}) {
  return new Promise(resolve => {
    const filho = spawn(exe(programa), args, { windowsHide: true, stdio: silencioso ? 'ignore' : 'inherit' })
    filho.on('error', () => resolve(1))
    filho.on('close', codigo => resolve(codigo ?? 1))
  })
}

async function aguardar(descricao, testar, limiteSegundos) {
  process.stdout.write(`${descricao}…`)
  for (let decorrido = 0; decorrido <= limiteSegundos; decorrido += 5) {
    if (await testar()) { console.log(' pronto.'); return }
    await esperar(5000)
  }
  console.log('')
  throw new Error(`${descricao} não ficou pronto em ${limiteSegundos} s.`)
}

function abrirDockerDesktop() {
  if (process.platform === 'darwin') return spawn('open', ['-a', 'Docker'], { detached: true, stdio: 'ignore' }).unref()
  if (process.platform !== 'win32') throw new Error('Inicie o Docker (systemctl start docker) e rode de novo.')
  const candidatos = [
    join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Docker', 'Docker', 'Docker Desktop.exe'),
    join(process.env.LOCALAPPDATA ?? '', 'Programs', 'DockerDesktop', 'Docker Desktop.exe'),
  ]
  const caminho = candidatos.find(existsSync)
  if (!caminho) throw new Error('Docker Desktop não encontrado. Abra-o manualmente e rode de novo.')
  spawn(caminho, [], { detached: true, stdio: 'ignore', windowsHide: true }).unref()
}

// Cada parte da demo e da observabilidade, na ordem em que dependem umas das outras.
const partes = [
  ['rephouse-demo', 'statefulset/postgres'], ['rephouse-demo', 'deployment/api'], ['rephouse-demo', 'deployment/frontend'],
  ['rephouse-observabilidade', 'statefulset/elasticsearch'], ['rephouse-observabilidade', 'deployment/kibana'], ['rephouse-observabilidade', 'daemonset/filebeat'],
]
const ROTULO_PAUSA = 'rephouse/demo-pausada'
const parar = process.argv[2] === 'parar'
const kubectl = (namespace, args) => rodar('kubectl', ['--context', contexto, '-n', namespace, ...args])

async function main() {
  const dockerOk = async () => await rodar('docker', ['version', '--format', '{{.Server.Version}}']) === 0
  if (!await dockerOk()) {
    console.log('Docker fechado: abrindo o Docker Desktop.')
    abrirDockerDesktop()
  }
  await aguardar('Motor do Docker', dockerOk, 180)
  await aguardar('Kubernetes do Docker Desktop', async () => await rodar('kubectl', ['--context', contexto, 'get', 'nodes']) === 0, 240)

  if (parar) {
    // Desliga sem apagar nada: réplicas a zero e o filebeat sem nó elegível. Bancos e volumes ficam intactos.
    for (const [namespace, recurso] of partes) await kubectl(namespace, recurso === 'daemonset/filebeat'
      ? ['patch', recurso, '-p', JSON.stringify({ spec: { template: { spec: { nodeSelector: { [ROTULO_PAUSA]: 'sim' } } } } })]
      : ['scale', recurso, '--replicas=0'])
    console.log('Demo do Kubernetes desligada (dados preservados). Para religar: npm run demo:subir')
    return
  }
  // Religa o que o demo:parar desligou (sem efeito se já estiver ligado).
  for (const [namespace, recurso] of partes) await kubectl(namespace, recurso === 'daemonset/filebeat'
    ? ['patch', recurso, '--type=json', '-p', JSON.stringify([{ op: 'remove', path: '/spec/template/spec/nodeSelector' }])]
    : ['scale', recurso, '--replicas=1'])
  for (const [namespace, recurso] of partes) {
    await aguardar(`${recurso} (${namespace})`, async () =>
      await rodar('kubectl', ['--context', contexto, '-n', namespace, 'rollout', 'status', recurso, '--timeout=5s']) === 0, 300)
  }

  console.log('\nTudo pronto. Abrindo os acessos (Ctrl+C encerra só os acessos, não a demo):')
  process.exitCode = await rodar('node', [join(import.meta.dirname, 'operar.mjs'), 'acessar'], { silencioso: false })
}

main().catch(erro => { console.error(`\n${erro.message}`); process.exitCode = 1 })
