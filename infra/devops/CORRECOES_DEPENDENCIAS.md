# Correção das dependências — 22/11/2026

As três dependências apontadas na primeira análise foram atualizadas. Aplicação e contrato permanecem em **4.2.0**, na branch `teste-devops`, sem commit, push ou alteração do banco principal.

## Alterações

| Pacote | Antes | Depois | Resolução |
|---|---|---|---|
| body-parser | 2.3.0 | 2.4.0 | Lockfile, dentro da faixa já aceita pelo Express 5.2.1 |
| multer | 2.4.0 | 2.5.0 | Dependência direta com versão exata |
| effect | 3.20.0 | 3.22.1 | Override restrito a `@prisma/config@7.10.0` |

O `qs` passou de 6.16.0 para 6.17.1 durante a resolução do body-parser, que passou a exigir `^6.16.1`. Não houve atualização geral das dependências. Express, Prisma, Sharp e as dependências da interface mantiveram suas versões. `npm ci` foi exercitado na reconstrução das imagens.

Referências dos mantenedores: [body-parser](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828), [Multer](https://github.com/expressjs/multer/security/advisories/GHSA-q7qp-rjg7-q26m) e [Effect](https://github.com/Effect-TS/effect/security/advisories/GHSA-7589-6fvf-x4pw).

As condições de exploração diferem: o parser JSON comprimido é utilizado pela aplicação; não foi encontrado `fileFilter` assíncrono nos uploads atuais nem uso direto de `Schema.TemplateLiteral` nas rotas. O Effect chega pela configuração do Prisma. O mantenedor classifica esse último aviso como Moderate; a tabela abaixo preserva a classificação HIGH do Trivy.

## Validação

- `npm run test:completo`: **338 aprovados, zero falhas, zero ignorados**; migrations reais aplicadas somente em schema temporário do PostgreSQL dedicado na porta 5544. Schema removido ao finalizar, contrato e tipos sincronizados.
- Testes HTTP e de robustez iniciais: **17 aprovados**; fazem parte da cobertura oficial, sem somá-los novamente aos 338.
- Build, tipagem e lint do frontend: aprovados. Suíte de navegador: **106 aprovados, uma falha preexistente, zero ignorados**. A falha continua em `motion-superficies.spec.ts:195`, com timeout na linha 230 ao consultar o diálogo durante a saída. Nenhuma nova falha foi encontrada nessa execução; o comando completo do frontend continua retornando **1**.
- Imagens recompiladas: **cinco verificações aprovadas**, incluindo execução sem root, Sharp/WebP e Nginx.
- Demonstração Kubernetes com a nova API: **seis verificações aprovadas** — login/SPA, foto privada, pagamento manual e comprovante, download, SSE, erros seguros e uso em computador/celular, agrupados pelos checks do relatório.
- Ensaio adicional em processo descartável, sem cliente de banco: JSON gzip válido e disponibilidade após corpo deflate com bytes extras. Trata-se de smoke de disponibilidade, não de reprodução completa de todas as condições dos advisories.

Nenhum teste existente foi apagado, ignorado ou flexibilizado. Os ensaios anteriores de persistência e rollback continuam registrados separadamente; não foram apresentados como novas execuções após esta correção.

## Comparação do Trivy

Escopo: severidades **HIGH e CRITICAL**, incluindo dependências de desenvolvimento. Mesma versão do scanner: 0.76.2.

| Alvo | HIGH antes → depois | CRITICAL antes → depois |
|---|---:|---:|
| Dependências dos lockfiles | 3 → **0** | 0 → **0** |
| Imagem API | 59 → **56** | 4 → **4** |
| Imagem migrations | 59 → **56** | 4 → **4** |
| Imagem frontend | 1 → **1** | 0 → **0** |

As CVEs `CVE-2026-111181`, `CVE-2026-113872` e `CVE-2026-121707` não aparecem nos novos resultados dos quatro alvos. As ocorrências nas imagens se sobrepõem e não representam uma contagem de CVEs distintas.

**A segurança geral continua reprovada.** Permanecem achados em pacotes Debian/Alpine e ferramentas das imagens. Gitleaks manteve 10 alertas no histórico e 8 nos arquivos, sem novas exclusões; Semgrep manteve zero achados nas cinco regras locais. O comando de segurança retornou **1**, corretamente, porque esses bloqueios permanecem. A ausência de HIGH/CRITICAL nos lockfiles não comprova ausência de vulnerabilidades de outras severidades.

## Ativação e evidências

- Nova imagem da API: `rephouse-api:4.2.0-6f559c3b-08324f0b4057`, ativa somente no namespace `rephouse-demo`, contexto `docker-desktop`.
- Nenhuma migration nova. Banco principal, volumes e imagem estável da API principal foram preservados; as correções ainda não estão ativadas nesse container principal.
- Demonstração: **http://localhost:5180/login**. Kibana: **http://localhost:5601**.
- Evidências desta correção: `.devops-local/devops/correcao-dependencias/`. Comparação em `comparacao-seguranca.json`, ativação em `ativacao-demo.json`, versões em `resolucao.json` e logs separados de build, frontend e backend.
- Resultados anteriores preservados em `antes/`; novos scans em `depois/seguranca/` e `.devops-local/devops/seguranca/`.
- Regressão backend: `.devops-local/testes-criticos/2026-11-22T23-23-08.741Z.json`.
- Resultado consolidado desta correção: `.devops-local/devops/correcao-dependencias/resultado.json`. Execução frontend: `.devops-local/interface/resultado-playwright.json`, iniciada em `2026-11-22T23:24:08.711Z`.

Para repetir: `npm ci`, `npm run test:completo`, `npm --prefix interface run verificar`, `node infra/devops/operar.mjs build`, `node infra/devops/validar-imagens.mjs` e `node infra/devops/seguranca.mjs`. Os testes usam seu banco dedicado; construir imagens não atualiza o ambiente principal automaticamente.
