# Evidências locais da preparação para integração

Contrato preservado: **2.0.1**. Resultado estruturado em [validacao-integracao.json](evidencias/validacao-integracao.json). As evidências anteriores de armazenamento, backup e carga permanecem preservadas e não são reapresentadas como novos ensaios.

## Matriz das jornadas

As verificações abaixo estão em `testes/jornadas-integracao.test.ts`, executado por `npm run test:integracao` e incorporado a `npm run verificar` pela suíte PostgreSQL.

| Requisito | Rotas e evidência | Resultado local |
| --- | --- | --- |
| Ambiente dedicado | Sem TEST_DATABASE_URL, banco com outro nome ou senha inadequada: recusa antes de conectar. Migrations e contas somente em schema próprio de `rabbu_mvp_test`. | Aprovado |
| Coleção reproduzível | 56 requisições Insomnia JSON v4; IDs e rotas conferidos; todas executadas por HTTP e respostas validadas pelo OpenAPI. | Aprovado pelo teste; UI não executada |
| Cadastro, login e perfil | `/api/auth/register`, `/api/auth/login`, `GET/PATCH /api/me`; conta sem vínculo e nome persistido. Exemplos de login e consulta executados. | Aprovado |
| Criação e entrada | Duas repúblicas criadas por HTTP; responsáveis promovidos; moradores entram nos contextos corretos. `/api/republicas/atual` sem vínculo retorna 409. | Aprovado |
| Moradores e paginação | `/api/membros`: lista somente a própria casa, parâmetros estritos, página além do fim vazia e totais corretos. `inativos=true` inclui os dois estados e exige ADMIN ou MASTER. | Aprovado |
| Tarefas | `/api/tarefas`, `/api/tarefas/{id}`: exemplos tipados criam, listam e concluem; data civil preservada; responsáveis de outra casa recusados; 403/404 sem alteração indevida. | Aprovado |
| Troca, saída e reentrada | Código inválido mantém vínculo anterior; troca desativa vínculo antigo; saída 204; reentrada reutiliza o vínculo histórico. Conferência SQL e `/api/me`. | Aprovado |
| Transferência | `/api/republicas/transferir-admin`: admin_id e perfis atualizados; token antigo perde poderes imediatamente; novo contexto obtido por `/api/me`. | Aprovado |
| MASTER e bloqueios | Listagens globais; NORMAL e ADMIN recusados; bloqueio/desbloqueio de república e conta; token antigo continua revogado após desbloqueio. | Aprovado |
| Sessão e 204 | Logout real e JWT expirado de fixture retornam 401; respostas 204 têm corpo vazio; exemplo de logout não tenta ler JSON. | Aprovado |
| Exclusão lógica | `DELETE /api/me` de conta sem dívida; usuário e vínculo preservados/desativados; login/token recusados; MASTER não reativa conta excluída. | Aprovado |
| CORS e erros | Preflight de tarefas, origem exata, headers expostos, limite real de autenticação 429 com Retry-After; readiness 503 por falha controlada e recuperação 200. | Aprovado; banco não desligado neste ensaio |
| Tipos e compatibilidade | Compilação estrita dos exemplos com DOM, sem Prisma; OpenAPI e tipos gerados continuam sem diferenças; rotas e respostas não alteradas. | Aprovado |

## Execuções e limites

- `npm run verificar`: **112 testes aprovados**, sendo 34 sem banco e 78 com PostgreSQL; zero falhas, zero ignorados. A contagem inclui os testes-pai do runner Node. A suíte nova contém 12 testes nessa contagem.
- `npm run integracao:demo` (entrypoint TypeScript também iniciado diretamente): API em loopback, health e ready 200; Ctrl+C executou limpeza do schema da sessão. Consultas posteriores encontraram zero schemas `integration_test_` restantes nos bancos inspecionados; tabelas públicas principal e de testes continuaram sem usuários, repúblicas ou pagamentos.
- Não houve correção das regras de negócio ou do banco: a entrega adiciona exemplos, ambiente de demonstração, coleção, testes e documentação. Não foi necessária migration.
- Não foram executadas telas reais nem importação manual no aplicativo Insomnia. A coleção foi validada pelo formato documentado, pelas rotas existentes e pela execução HTTP de todas as suas requisições.
- Não houve push, PR, publicação ou execução remota da CI. As alterações permanecem locais. A regressão financeira anterior foi executada; não houve novo desenvolvimento ou ensaio de carga de pagamentos.

## Reproduzir

Com PostgreSQL de testes configurado, execute `npm ci`, `npm run db:generate` e `npm run verificar`. Para demonstração manual, siga [JORNADAS_INTEGRACAO.md](JORNADAS_INTEGRACAO.md). Não é necessário iniciar a demonstração para executar os testes.
