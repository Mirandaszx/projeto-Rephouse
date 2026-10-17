import test from 'node:test'
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { rmdir } from 'node:fs/promises'
import { backup, assertInsideRoot, root, type Stack } from '../codigo/comandos/operacao-docker.js'
import { civilDate, appTimeZone, DEFAULT_TIME_ZONE } from '../codigo/configuracao/time-zone.js'

test('backup reinicia a API quando pg_dump falha e não anuncia cópia completa', async () => {
  const calls: string[] = []
  let output: string | undefined
  const fake: Stack = {project:'teste-sem-docker',compose:'docker-compose.backend.yml',env:{},args:[]}
  try {
    await assert.rejects(backup(fake,async (_s,args,opts) => {
      calls.push(args[0]!)
      if (args[0]==='ps') return 'id-ficticio'
      if (args.includes('dist/comandos/verificar-comprovantes.js')) return JSON.stringify({invalidos:0,referenciasLegadasPendentes:0})
      if (args.includes('node')) return JSON.stringify({version:'1.0.0',timeZone:'America/Sao_Paulo'})
      if (args[0]==='exec') { output=opts?.output; throw new Error('falha simulada de captura') }
      return ''
    },async ()=>JSON.stringify([{Type:'volume',Name:'teste-sem-docker_comprovantes',Destination:'/app/armazenamento/comprovantes'}])),/falha simulada/)
    assert.deepEqual(calls,['ps','ps','exec','exec','stop','exec','start'])
  } finally {
    if (output) {
      const directory=dirname(output)
      assertInsideRoot(directory)
      assert.equal(dirname(directory),join(root,'copias-seguranca'))
      await rmdir(directory) // Somente o diretório vazio criado por este teste.
    }
  }
})

test('horário de Brasília é padrão; data civil respeita o fuso selecionado', () => {
  assert.equal(DEFAULT_TIME_ZONE,'America/Sao_Paulo')
  assert.equal(appTimeZone('America/Sao_Paulo'),'America/Sao_Paulo')
  assert.equal(civilDate(new Date('2026-10-01T02:59:59Z'),'America/Sao_Paulo'),'2026-09-30')
  assert.equal(civilDate(new Date('2026-10-01T03:00:00Z'),'America/Sao_Paulo'),'2026-10-01')
  assert.equal(civilDate(new Date('2026-10-01T03:00:00Z'),'America/Manaus'),'2026-09-30')
  assert.throws(()=>appTimeZone('Brasil'))
  assert.throws(()=>appTimeZone('+03:00'))
})
