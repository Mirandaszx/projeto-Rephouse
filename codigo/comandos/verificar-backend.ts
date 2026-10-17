import 'dotenv/config'
import { spawn } from 'node:child_process'

const testUrl = process.env.TEST_DATABASE_URL
if (!testUrl || !URL.canParse(testUrl) || new URL(testUrl).pathname !== '/rabbu_mvp_test') {
  console.error('Defina TEST_DATABASE_URL para o banco dedicado rabbu_mvp_test. A verificação completa não aceita testes de integração ignorados.')
  process.exitCode = 1
} else {
  const npm = process.env.npm_execpath
  if (!npm) throw new Error('Execute este comando com npm run verificar.')
  for (const script of ['build', 'api:exportar', 'typecheck', 'test', 'test:db']) {
    // Invocar a CLI pelo Node evita dependência de shell e funciona também no Windows.
    const result = await new Promise<number>(resolve => {
      const child = spawn(process.execPath, [npm, 'run', script], { stdio: 'inherit', env: process.env, windowsHide: true })
      child.once('error', () => resolve(1))
      child.once('exit', code => resolve(code ?? 1))
    })
    if (result !== 0) { process.exitCode = result; break }
  }
}
