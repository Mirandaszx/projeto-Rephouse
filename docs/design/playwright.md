# Playwright local do RepHouse

## Estado em 30/10/2026

O frontend possui `@playwright/test` **1.63.0**, instalado como dependência de desenvolvimento e fixado no lockfile. Esta é uma automação local por CLI; não instala nem conecta um servidor MCP/conector Playwright ao Codex.

Somente infraestrutura foi adicionada. O frontend ainda é o starter: nenhum fluxo da aplicação foi testado e nenhum teste artificial do starter foi criado. O desenho da interface e as regras de negócio continuam sujeitos à aprovação do design.

## Executar

No PowerShell, a partir de `interface/`:

```powershell
rtk npm ci
rtk node node_modules/@playwright/test/cli.js --version
rtk npm run test:e2e:list
rtk npm run test:e2e
rtk npm run test:e2e:report
```

Os testes futuros devem ficar em `interface/tests/e2e/`. Enquanto esse diretório não contiver testes, os comandos de listagem/execução terminam com `No tests found`; isso não representa aprovação de testes.

O Playwright inicia o Vite em `http://localhost:5173`, porta estrita. Fora de CI, pode reutilizar um servidor já disponível nesse endereço. Em CI, inicia um servidor próprio. Para testar um ambiente já iniciado sem subir Vite, defina `PLAYWRIGHT_BASE_URL` antes da execução:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'http://localhost:5173'
rtk npm run test:e2e
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

Os scripts usam o pacote do projeto, sem depender de instalação global. Se o Chromium exigido pelo pacote não estiver presente, instale-o para esse projeto:

```powershell
rtk node node_modules/@playwright/test/cli.js install chromium
```

O sandbox do Codex pode usar um cache diferente do Windows do usuário. Nesta sessão, o Chromium compatível já estava em `C:/Users/jluca/AppData/Local/ms-playwright`; o probe o reutilizou por `PLAYWRIGHT_BROWSERS_PATH`. Se necessário, na mesma sessão de PowerShell:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/jluca/AppData/Local/ms-playwright'
rtk npm run test:e2e
Remove-Item Env:PLAYWRIGHT_BROWSERS_PATH
```

Esse caminho é específico desta máquina e não está fixado na configuração versionada.

## Configuração

| Item | Valor |
| --- | --- |
| Desktop | Chromium, viewport 1440 × 900 |
| Celular | Chromium, viewport 390 × 844, toque, `isMobile`, escala 3 |
| Capturas | Screenshot apenas em falhas |
| Diagnóstico | Trace preservado em falhas |
| Saídas | `interface/output/playwright-results` e `interface/output/playwright-report`, ignorados pelo Git |
| CI | Bloqueia `test.only`, uma nova tentativa em falhas |

O perfil celular é emulação no Chromium, não validação em aparelho físico ou Safari/iOS. O relatório HTML não abre automaticamente.

## Verificação realizada

- Ambiente: Node `v24.14.1`, npm `11.11.0`.
- Instalação: a tentativa no sandbox falhou por DNS (`ENOTFOUND`); a repetição autorizada fora do sandbox instalou 174 pacotes, com `--ignore-scripts --no-audit --no-fund`.
- `rtk node node_modules/@playwright/test/cli.js --version`: `Version 1.63.0`.
- `rtk node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --skipLibCheck --target ES2023 --module nodenext --types node playwright.config.ts`: saída 0.
- `rtk npm run test:e2e:list`: configuração carregada; 0 testes em 0 arquivos; saída 1, `No tests found`.
- Probe efêmero por API Playwright: carregou os projetos de `playwright.config.ts`; Chromium headless abriu `about:blank`, recebeu HTML com marcador no DOM e validou o marcador, as dimensões, o toque e a escala via `page.evaluate`. Desktop: `1440 × 900`, toque 0, escala 1; celular: `390 × 844`, toque 1, escala 3. Ambos concluíram com saída 0. Nenhum teste foi salvo e não houve navegador visível.

Comando exato do probe, executado a partir de `interface/` (o caminho do cache é específico desta máquina):

```powershell
rtk proxy node --input-type=module -e "process.env.PLAYWRIGHT_BROWSERS_PATH='C:/Users/jluca/AppData/Local/ms-playwright'; const {chromium}=await import('@playwright/test'); const {default:config}=await import('./playwright.config.ts'); const {default:assert}=await import('node:assert/strict'); const browser=await chromium.launch({headless:true}); try { for (const project of config.projects) { const {browserName,...options}=project.use; assert.equal(browserName,'chromium'); const context=await browser.newContext(options); try { const page=await context.newPage(); await page.goto('about:blank'); await page.setContent('<meta name=viewport content=width=device-width,initial-scale=1><main data-probe=ready>RepHouse Playwright probe</main>'); const result=await page.evaluate(()=>({marker:document.querySelector('main')?.dataset.probe,width:innerWidth,height:innerHeight,touch:navigator.maxTouchPoints,scale:devicePixelRatio})); assert.equal(result.marker,'ready'); assert.equal(result.width,options.viewport.width); assert.equal(result.height,options.viewport.height); assert.equal(result.touch>0,Boolean(options.hasTouch)); assert.equal(result.scale,options.deviceScaleFactor||1); console.log(JSON.stringify({project:project.name,...result})); } finally { await context.close(); } } } finally { await browser.close(); }"
```

Saída obtida:

```json
{"project":"desktop-chromium","marker":"ready","width":1440,"height":900,"touch":0,"scale":1}
{"project":"mobile-chromium","marker":"ready","width":390,"height":844,"touch":1,"scale":3}
```

O probe confirma execução real do browser e dos contextos. Não validou o servidor Vite automático, o frontend, a API, autenticação, autorização, persistência ou recuperação de erros. Não foram geradas imagens do documento vazio por não acrescentarem evidência útil.

## Cobertura futura

Após a aprovação do design e a implementação dos fluxos, criar cenários com dados isolados para cada perfil de acesso real. Preferir localizadores semânticos (`getByRole`, rótulos e nomes acessíveis), validar estados vazios/erro/sucesso e executar os fluxos principais nos dois projetos configurados.

Para fluxos com backend, preparar dados por API, executar a ação na interface e verificar a resposta/persistência e as restrições de autorização. Separar sessões por perfil, manter credenciais e `storageState` fora do Git e remover os dados de teste ao fim. Definir os cenários a partir das regras aprovadas, sem presumir permissões ou telas ainda não implementadas.
