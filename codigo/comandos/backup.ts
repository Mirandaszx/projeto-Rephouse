import { backup, stack } from './operacao-docker.js'
try {
  const [project, envFile, config] = process.argv.slice(2)
  if (!project) throw new Error('Uso: npm run backup -- <projeto> [arquivo-env] [backend|desenvolvimento]')
  console.log(`Backup concluído: ${await backup(await stack(project, envFile, config))}`)
} catch (error) { console.error(error instanceof Error ? error.message : 'Backup falhou.'); process.exitCode = 1 }
