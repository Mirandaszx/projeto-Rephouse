import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve, dirname, basename } from 'node:path'

// Consolida evidências existentes, sem conexão com PostgreSQL ou Docker.
const path = resolve(process.argv[2] ?? '')
assert.equal(dirname(path), resolve('.devops-local/testes-criticos'))
assert.match(basename(path), /^[\dT.\-Z]+\.json$/)
const report = JSON.parse(await readFile(path, 'utf8'))
assert.equal(report.destino.banco, 'rabbu_mvp_test')
assert.equal(report.destino.porta, '5544')
const log = await readFile(path.replace(/\.json$/, '.log'), 'utf8')
assert.match(log,/^ok \d+ - migration 2\.2 preserva despesas, rateios, pagamentos e bytes de comprovantes anteriores$/m,
  'O teste de preservação financeira precisa ter sido executado e aprovado.')
const section = log.slice(log.lastIndexOf('# Subtest: 36 regras auditadas:'))
assert.ok(section.startsWith('# Subtest: 36 regras auditadas:'))
const successes = [...section.matchAll(/^    ok \d+ - (.+)$/gm)].map(match => match[1])
assert.equal(successes.length, 53)
assert.equal(/^\s*not ok /m.test(section), false)
const baseline = JSON.parse(await readFile('documentacao/auditoria-schema/resultado.json','utf8'))
const sha = value => createHash('sha256').update(value).digest('hex')
const previous = []
for (const migration of baseline.migrationsAplicadas) {
  const checksum = sha(await readFile(`prisma/migracoes/${migration.nome}/migration.sql`))
  assert.equal(checksum,migration.checksum)
  previous.push({nome:migration.nome,checksum,inalterada:true})
}
const migrations = []
for (const name of (await readdir('prisma/migracoes')).filter(name=>name.startsWith('20261118')).sort()) {
  const up = await readFile(`prisma/migracoes/${name}/migration.sql`,'utf8')
  const down = await readFile(`prisma/migracoes/${name}/down.sql`,'utf8')
  migrations.push({nome:name,idaSha256:sha(up),voltaSha256:sha(down),checks:[...up.matchAll(/ADD CONSTRAINT (aud_\w+) CHECK/g)].map(match=>match[1])})
}
assert.equal(migrations.length,9)
assert.equal(migrations.flatMap(item=>item.checks).length,36)
const evidence = {
  executadoEm:report.executadoEm, ambiente:'local exclusivo de testes',versaoAplicacao:'2.2.0',
  destino:report.destino, comando:'npm run test:completo',
  regressao:report.totais,codigoSaida:report.codigoSaida,schemaTemporarioRemovido:report.schemaRemovido,
  schema:{testes:successes.length,aprovados:successes.length,falhas:0,cenarios:successes},
  migrations,anteriores:previous,contratoAntes:report.contratoAntes,contratoDepois:report.contratoDepois,
  falhasConhecidas:{bugsDeProduto:['BUG-01: idempotência de despesas','BUG-02: idempotência de tarefas','BUG-03: valor com vírgula retorna 500'],
    testesFalhandoDosBugs:8,expectativaDesatualizada:{arquivo:'testes/financeiro-migracao.test.ts',linha:18,
      descricao:'Exige que a migration 2.2 seja a última do projeto, antes de verificar a preservação dos registros.',
      status:'Preparação ajustada com autorização do usuário: seleciona explicitamente a migration 2.2, mantendo todas as verificações de dados e comprovantes. Teste aprovado.'}},
  restricoesValidadas:36, triggersNovos:3,
  bancoEquipeAlterado:false, dadosEquipeAlterados:false,ciRemotaExecutada:false,commitRealizado:false,pushRealizado:false,
  resultado:'Restrições adicionais e teste histórico de migração aprovados. Backend integralmente não aprovado: permanecem os três bugs de produto anteriores.',
  logLocal:'.devops-local/testes-criticos/'+basename(path).replace(/\.json$/,'.log'),
}
await writeFile('documentacao/auditoria-schema/validacao-schema.json',JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify({testes:report.totais,novosTestes:successes.length,migrations:migrations.length,anterioresIntactas:previous.length}))
