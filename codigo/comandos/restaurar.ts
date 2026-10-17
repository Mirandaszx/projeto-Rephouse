import { restore, stack } from './operacao-docker.js'
try {
  const [project, directory, envFile] = process.argv.slice(2)
  if (!project || !directory) throw new Error('Uso: npm run restaurar -- rephouse-restauracao-<nome> <pasta-backup> [arquivo-env]')
  await restore(await stack(project, envFile), directory)
  console.log('Restauração isolada concluída. Confira a jornada e os comprovantes antes de utilizar os dados.')
} catch (error) { console.error(error instanceof Error ? error.message : 'Restauração falhou.'); process.exitCode = 1 }
