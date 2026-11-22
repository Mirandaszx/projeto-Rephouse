# RepHouse

Aplicação web para organização de repúblicas e residências compartilhadas.

O código local evoluiu para **4.2.0**, com [foto e informações do perfil](documentacao/PERFIL_E_FOTO.md): enquadramento, troca e remoção, avatares autenticados e confirmação por link somente quando registrada. A versão foi ativada no principal local em 22/11/2026, após autorização, backup conferido e atualização das permissões: **26 migrations aplicadas, nenhuma pendente**, dados e volume preservados. Veja a [evidência de ativação](documentacao/evidencias/ativacao-perfil-principal-2026-11-22.json). Backend: 337 testes aprovados. As oito jornadas de perfil passaram; a última suíte completa do frontend registrou três falhas descritas no guia, sem aprovação global.

A entrega **4.1.0** acrescentou [avisos gerais e aba Todas](documentacao/NOTIFICACOES_GERAIS.md). Todas reúne tarefas, despesas e entrada/saída de moradores; Tarefas e Despesas mantêm seus filtros. A implementação foi validada no banco dedicado. Após autorização explícita, a migration foi ativada no principal com backup, atualização das permissões e preservação dos dados e volumes. Veja a [evidência de ativação](documentacao/evidencias/ativacao-gerais-principal-2026-11-21.json).

A entrega **4.0.0** introduziu [tarefas compartilhadas e notificações internas em tempo real](documentacao/NOTIFICACOES_E_TAREFAS.md). Moradores criam tarefas disponíveis ou para si e podem assumir uma disponível. O sino separa avisos de tarefas e vencimentos, com leitura individual e persistência no PostgreSQL. As duas migrations 4.0.0 foram ativadas em 21/11/2026, após autorização, backup e conferência dos dados e permissões. O contrato permite `responsavelId: null`; a listagem de notificações permanece paginada inclusive em `/api/front/v1`. Veja a [evidência dessa ativação](documentacao/evidencias/ativacao-notificacoes-principal-2026-11-21.json).

A autenticação por e-mail, introduzida na **3.0.0** e ativada em 20/11/2026, permanece preservada. Novos cadastros aguardam confirmação por e-mail e há login por link mágico; o envio real pelo Resend ainda não foi validado. Veja [configuração, ativação e limitações](documentacao/AUTENTICACAO_EMAIL.md). As contas existentes conservam login por senha. As listagens principais continuam retornando `{dados,paginacao}`, com `pagina=1` e `limite=20` por padrão.

A [revisão 2.2.1](documentacao/CORRECOES_2_2_1.md) corrige entradas monetárias inválidas e acrescenta proteção opcional por `Idempotency-Key` nas criações de despesas e tarefas. Os formulários usam essa proteção e conservam tentativas incertas em memória. Em 20/11/2026, após autorização explícita e backup, as dez migrations pendentes foram aplicadas no banco principal local e as permissões atualizadas. Os dados anteriores e os volumes foram preservados; os testes continuam usando o banco dedicado.

Para integrar conta, repúblicas, moradores, tarefas e MASTER, siga o [roteiro sem operações financeiras](documentacao/JORNADAS_INTEGRACAO.md). Ele inclui coleção Insomnia, exemplos fetch e demonstração isolada por `npm run integracao:demo`.

Na terceira apresentação, o foco é demonstrar funcionalidades, arquitetura, banco e testes. O caminho principal é o Docker Compose local descrito abaixo e no [guia operacional](documentacao/OPERACAO_BACKEND.md). Não é necessário preparar homologação separada, demonstrar backup/restauração ou executar carga e recuperação.

O [financeiro 2.2.0](documentacao/FINANCEIRO_2_2.md) acrescenta recorrências mensais, avisos de vencimento e resumo individual calculado no backend. A demonstração isolada está disponível em `npm run financeiro:demo`; o registro manual de pagamentos permanece preservado.

A extensão de [término das recorrências](documentacao/RECORRENCIA_DATA_FIM.md) permite escolher até qual dia, mês e ano uma conta repete. Está ativa no principal local após autorização e backup, na ocasião com 25 migrations, nenhuma pendência e dados/volume preservados. Sua [evidência de ativação](documentacao/evidencias/ativacao-recorrencia-fim-principal-2026-11-21.json) é independente da ativação anterior de notificações.

**Uso diário com dados persistentes:** acesse `http://localhost:5173/login`. Neste checkout, o override local `.devops-local/principal-estavel.yml`, descrito no [guia operacional](documentacao/OPERACAO_BACKEND.md), mantém a imagem compilada 4.2.0, incluindo Sharp. A API usa o banco configurado no `.env` e o volume PostgreSQL existente. Os comandos `financeiro:demo` e `integracao:demo` criam ambientes descartáveis com contas fictícias; não use seus links para acessar as contas reais da equipe. A demonstração financeira na porta 5175 não compartilha os dados do ambiente principal.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS e ESLint
- Backend: Node.js, Express e TypeScript em modo estrito (ESM)
- Banco de dados: PostgreSQL
- ORM: Prisma 7.10.0, com migrations versionadas
- Ambiente local: Docker Compose

## Arquitetura do backend

O backend usa um monólito modular em camadas, organizado por funcionalidade.
O módulo financeiro separa domínio, services e repositories; a infraestrutura
compartilha conexão, transações ACID e tratamento HTTP de erros.

Veja [ARQUITETURA.md](documentacao/ARQUITETURA.md) para a estrutura e as responsabilidades.
As pastas usam português sem acentos: `codigo`, `modulos`, `infraestrutura`,
`compartilhado`, `testes`, `documentacao` e `interface`. Diretórios técnicos como
`node_modules`, `dist` e `.git` conservam os nomes das ferramentas.
Os módulos auth, repúblicas, financeiro, tarefas, dashboard e master já possuem
rotas e serviços. A migração inclui pagamentos parciais, cobrança após saída da
república e exclusão lógica da própria conta. A primeira interface React já integra
acesso, perfil, repúblicas, moradores e tarefas. Consulte o [guia do frontend](interface/README.md)
e a [direção visual escolhida](documentacao/DIRECAO_VISUAL_FRONTEND.md).
O [sistema visual atual](DESIGN.md) concentra tokens, temas e componentes; os [ajustes da revisão Impeccable](documentacao/REFINAMENTO_IMPECCABLE_2026_11_20.md) registram o tratamento de erros, foco e carregamento por página.
Veja [MIGRACAO_DJANGO.md](documentacao/MIGRACAO_DJANGO.md) para as regras e os endpoints.
O [guia de integração do backend](documentacao/INTEGRACAO_BACKEND.md) explica
o contrato importável, CORS, contas de demonstração e a verificação automatizada.

## Backend local em TypeScript

Com `.env` configurado e PostgreSQL disponível, execute na raiz:

```bash
npm ci
npm run auth:secret
npm run db:generate
npm run typecheck
npm test
npm run dev
```

Migrations aprovadas são executadas separadamente com a conta administrativa; a API usa `DATABASE_URL` limitada. Siga o [guia de permissões PostgreSQL](documentacao/PERMISSOES_POSTGRESQL.md). O banco principal local deste checkout tem 21 migrations aplicadas, sem pendências na conferência de 20/11/2026. Outros ambientes exigem conferência e autorização próprias.

`npm run dev` usa `tsx` com recarga automática. Para compilar e executar o resultado:

```bash
npm run build
npm start
```

O build gera JavaScript em `dist/`. `npm run test:db` executa a suíte PostgreSQL/ACID
usando a `TEST_DATABASE_URL` explícita, conforme [a documentação do banco](documentacao/BANCO_DE_DADOS.md).

Com o banco de testes preparado, `npm run verificar` executa build, exportação do
OpenAPI, verificação de tipos e todas as suítes. Para gerar o contrato importável,
use `npm run api:exportar`. Para criar a demonstração em desenvolvimento, defina
`DEMO_PASSWORD` no `.env` e execute `npm run db:seed`.

## Rodar com Docker

Copie `.env.example` para `.env`, configure o banco e execute `npm run auth:secret`
para gerar o segredo JWT local. O banco padrão desta versão é `rabbu_mvp`.
As migrations e a preparação das dependências são operações administrativas explícitas. Reiniciar a API não aplica migrations.

A modelagem segue o documento **RABBU — MVP / Primeira Entrega (3 perfis)**.
O modelo atual possui 15 tabelas de domínio, incluindo autenticação Google, quatro tabelas de recorrências e o controle de criações idempotentes. Usuários, repúblicas, membros, despesas, rateios, pagamentos, comprovantes e tarefas permanecem preservados.
As operações financeiras usam transações ACID com isolamento `SERIALIZABLE`,
rollback em caso de falha e repetição limitada de conflitos de concorrência.
Veja [a documentação do banco](documentacao/BANCO_DE_DADOS.md) para relações, regras,
uso local do Prisma e testes. O contrato OpenAPI está em `GET /api/openapi.json`.

Com Docker Desktop aberto, na raiz do repositório:

```bash
# Banco novo ou migrations pendentes explicitamente aprovadas:
docker compose up -d --wait postgres
docker compose --profile manutencao run --rm migracoes
docker compose --profile manutencao run --rm migracoes npm run db:permissoes -- --compose
docker compose up -d --wait api frontend
```

O serviço manual `migracoes` instala pelo lockfile e prepara o banco; `db:permissoes` separa a conta administrativa da conta da API. Para o ambiente existente, preserve o override e siga o [guia operacional](documentacao/OPERACAO_BACKEND.md). Não aplique migrations futuras sem conferir o destino e sua autorização. Nas execuções seguintes, `docker compose up -d --wait api frontend` reutiliza as dependências e os dados. A aplicação fica disponível em:

- Frontend: http://localhost:5173
- API: http://localhost:3000/api/health
- OpenAPI: http://localhost:3000/api/openapi.json
- PostgreSQL: localhost:5432

As portas do Compose principal são publicadas somente em `127.0.0.1`, para acesso pelo próprio computador. Os containers continuam se comunicando pelos nomes internos `postgres` e `api`. Acesso de outros computadores da rede exige uma configuração explícita separada.

O frontend encaminha chamadas `/api` para a API pelo proxy do Vite. Dentro da rede do Compose, a API encontra o banco pelo nome do serviço `postgres`.

Para parar os serviços sem apagar os dados do banco:

```bash
docker compose down
```

As credenciais têm valores padrão para desenvolvimento local e podem ser substituídas por variáveis em um arquivo `.env` na raiz. Não use esses valores padrão em produção.

O volume `postgres_data` preserva registros e comprovantes ao reiniciar os containers ou usar `docker compose down`. Não use `down -v`, reset ou limpeza de volumes no procedimento normal. Em bancos já inicializados, mudar as variáveis de senha não altera as credenciais existentes.

A [matriz de validação](documentacao/VALIDACAO_MVP.md) relaciona requisitos, implementação e evidências históricas. O [roteiro de demonstração](documentacao/ROTEIRO_DEMONSTRACAO_BACKEND.md) orienta a apresentação das funcionalidades e do estado no banco.

## Testes locais e GitHub Actions

Para executar toda a verificação do backend com isolamento automático:

```powershell
npm run test:completo
```

Com Docker Desktop aberto e as dependências instaladas, esse comando prepara somente o PostgreSQL de testes na porta 5544 e usa schemas temporários. Não altera `.env` nem o banco da equipe. Executa a regressão anterior e os novos testes por HTTP real; falhas e testes ignorados impedem aprovação. Veja a [especificação e matriz dos fluxos críticos](documentacao/TESTES_FLUXOS_CRITICOS.md), a [lista de bugs reproduzidos](documentacao/BUGS_REQUEST_SPECS.md) e o [resultado local](documentacao/evidencias/validacao-request-specs.json). Não inclui E2E de navegador, carga ou recuperação operacional.

O procedimento manual abaixo permanece como alternativa histórica para quem também executa a suíte de navegador da interface; ela é separada dos novos request specs.

Com Node.js 24 e dependências instaladas na raiz e em `interface`, prepare somente o PostgreSQL dedicado aos testes:

```powershell
docker compose -f interface/docker-compose.test.yml up -d --wait postgres
$env:TEST_DATABASE_URL='postgresql://rephouse_interface_test:rephouse_interface_test_local@127.0.0.1:5544/rabbu_mvp_test'
$env:DATABASE_URL=$env:TEST_DATABASE_URL
npm run db:deploy
npm run verificar
npm --prefix interface run verificar
git diff --exit-code -- documentacao/openapi.json integracao/api.d.ts
```

Use um terminal exclusivo para esses comandos; feche-o ao terminar para não reaproveitar a URL de testes em uma execução da aplicação. O banco `rabbu_mvp_test` usa a porta 5544 e volume próprio. As migrations acima são aplicadas somente nele; os testes usam transações revertidas ou schemas descartáveis. Não use o banco da equipe.

O GitHub Actions continua em pushes e PRs para `main` e `homologacao`, além do acionamento manual. Valida o backend com Node.js 24, PostgreSQL 18 temporário, instalação pelo lockfile, migrations, regressão completa e contrato/tipos sincronizados. Os testes de navegador da interface são executados localmente pelo comando acima. Nenhum evento do workflow executa carga, recuperação, backup, restauração ou deploy. Resultados locais e remotos são registrados separadamente.

## Recursos opcionais preservados

A [auditoria do schema](documentacao/auditoria-schema/RELATORIO.md) registra o inventário e as contagens anteriores. As [migrations adicionais e suas reversões](documentacao/auditoria-schema/IMPLEMENTACAO.md) foram preparadas para validação exclusivamente no PostgreSQL de testes; o banco da equipe não foi migrado nesta etapa. Os testes SQL fazem parte de `npm run test:completo`.

Dockerfile, Compose compilado, ambiente de homologação, scripts de backup/restauração e ensaios de carga/recuperação continuam disponíveis. Não são requisitos da terceira apresentação nem etapas do Actions atual. Os guias [operacional](documentacao/OPERACAO_BACKEND.md), [de homologação](documentacao/HOMOLOGACAO_BACKEND.md) e [de consolidação](documentacao/CONSOLIDACAO_BACKEND.md) identificam essas alternativas e seus registros anteriores. Planejamento de hospedagem, custos de provedor e escalabilidade fica para outra etapa.

Comprovantes são armazenados no PostgreSQL, junto ao pagamento, na mesma transação. Veja [migração e operação](documentacao/COMPROVANTES_POSTGRESQL.md) e os [tipos e exemplos para integração](integracao/README.md).

Na versão 2.1.0, o backend oferece suporte ao Google. Consulte o [guia de configuração e validação](documentacao/AUTENTICACAO_GOOGLE.md). A interface principal agora usa o design do PR #2 e ainda precisa incorporar o botão Google; a validação real com o provedor também depende do Client ID e das contas de teste.

## Integração do novo frontend

O design do [PR #2](https://github.com/Mirandaszx/projeto-Rephouse/pull/2) foi adotado na pasta `interface` e é servido em **http://localhost:5173**. O login está em `/login`, o cadastro em `/cadastro` e o painel em `/republica`. Os caminhos antigos com `/novo` redirecionam para os atuais. Ele usa o adaptador `/api/front/v1`; a API 2.1.0 em `/api` mantém a paginação. Consulte o [guia da interface](interface/README.md) e o [guia de integração](documentacao/INTEGRACAO_FRONTEND_PR2.md).
