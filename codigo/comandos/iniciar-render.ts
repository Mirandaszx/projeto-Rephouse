// Partida no Render: aplica as migrações pendentes e só então sobe a API.
// O plano gratuito não tem etapa de pré-deploy, então as migrações rodam aqui, antes de abrir a porta.
// Se a migração falhar, a API não sobe e o deploy anterior continua no ar.
import { spawnSync } from 'node:child_process'

const migracao = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { stdio: 'inherit' })
if (migracao.status !== 0) {
  process.exitCode = migracao.status ?? 1
} else {
  await import('../server.js')
}
