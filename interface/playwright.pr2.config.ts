import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import base from './playwright.config'

if (!process.env.PR2_FRONTEND_PATH) throw new Error('Defina PR2_FRONTEND_PATH antes de executar os testes do PR #2.')
if (!Array.isArray(base.webServer)) throw new Error('Configuração do servidor de testes inválida.')
process.env.PR2_REFERENCE_ROUTES = '1'
export default defineConfig({
  ...base,
  testDir: './testes-pr2',
  testMatch: 'jornadas.spec.ts',
  outputDir: '../.devops-local/revisao-pr2/playwright',
  reporter: [['list'], ['json', { outputFile: '../.devops-local/revisao-pr2/resultado-http-real.json' }]],
  use: { ...base.use, baseURL: 'http://127.0.0.1:5182' },
  webServer: [base.webServer[0]!, {
    command: 'node --import tsx ferramentas/interface/servir-pr2.ts',
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { PR2_FRONTEND_PATH: process.env.PR2_FRONTEND_PATH, PR2_API_URL: 'http://127.0.0.1:3405', PR2_FRONTEND_PORT: '5182' },
    url: 'http://127.0.0.1:5182', reuseExistingServer: false, timeout: 60000,
  }],
})
