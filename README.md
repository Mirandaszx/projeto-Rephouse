# RepHouse

Aplicação web para organização de repúblicas e residências compartilhadas.

O backend está na versão **2.1.0**: as listagens da API principal retornam `{dados,paginacao}`, com `pagina=1` e `limite=20` por padrão. Veja o [guia de integração](documentacao/INTEGRACAO_BACKEND.md) para os contratos.

Para integrar conta, repúblicas, moradores, tarefas e MASTER, siga o [roteiro sem operações financeiras](documentacao/JORNADAS_INTEGRACAO.md). Ele inclui coleção Insomnia, exemplos fetch e demonstração isolada por `npm run integracao:demo`.

Na terceira apresentação, o foco é demonstrar funcionalidades, arquitetura, banco e testes. O caminho principal é o Docker Compose local descrito abaixo e no [guia operacional](documentacao/OPERACAO_BACKEND.md). Não é necessário preparar homologação separada, demonstrar backup/restauração ou executar carga e recuperação.

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
Veja [MIGRACAO_DJANGO.md](documentacao/MIGRACAO_DJANGO.md) para as regras e os endpoints.
O [guia de integração do backend](documentacao/INTEGRACAO_BACKEND.md) explica
o contrato importável, CORS, contas de demonstração e a verificação automatizada.

## Backend local em TypeScript

Com `.env` configurado e PostgreSQL disponível, execute na raiz:

```bash
npm ci
npm run auth:secret
npm run db:generate
npm run db:deploy
npm run typecheck
npm test
npm run dev
```

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
As migrations são aplicadas automaticamente antes da API iniciar.

A modelagem segue o documento **RABBU — MVP / Primeira Entrega (3 perfis)**.
São oito tabelas: usuários, repúblicas, membros, despesas, rateios, pagamentos, comprovantes e tarefas.
As operações financeiras usam transações ACID com isolamento `SERIALIZABLE`,
rollback em caso de falha e repetição limitada de conflitos de concorrência.
Veja [a documentação do banco](documentacao/BANCO_DE_DADOS.md) para relações, regras,
uso local do Prisma e testes. O contrato OpenAPI está em `GET /api/openapi.json`.

Com Docker Desktop aberto, na raiz do repositório:

```bash
docker compose up
```

Na primeira execução, o Compose baixa a imagem do Node e instala as dependências usando os arquivos de lock. A aplicação fica disponível em:

- Frontend: http://localhost:5173
- API: http://localhost:3000/api/health
- OpenAPI: http://localhost:3000/api/openapi.json
- PostgreSQL: localhost:5432

O frontend encaminha chamadas `/api` para a API pelo proxy do Vite. Dentro da rede do Compose, a API encontra o banco pelo nome do serviço `postgres`.

Para parar os serviços sem apagar os dados do banco:

```bash
docker compose down
```

As credenciais têm valores padrão para desenvolvimento local e podem ser substituídas por variáveis em um arquivo `.env` na raiz. Não use esses valores padrão em produção.

O volume `postgres_data` preserva registros e comprovantes ao reiniciar os containers ou usar `docker compose down`. Não use `down -v`, reset ou limpeza de volumes no procedimento normal. Em bancos já inicializados, mudar as variáveis de senha não altera as credenciais existentes.

A [matriz de validação](documentacao/VALIDACAO_MVP.md) relaciona requisitos, implementação e evidências históricas. O [roteiro de demonstração](documentacao/ROTEIRO_DEMONSTRACAO_BACKEND.md) orienta a apresentação das funcionalidades e do estado no banco.

## Testes locais e GitHub Actions

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

Dockerfile, Compose compilado, ambiente de homologação, scripts de backup/restauração e ensaios de carga/recuperação continuam disponíveis. Não são requisitos da terceira apresentação nem etapas do Actions atual. Os guias [operacional](documentacao/OPERACAO_BACKEND.md), [de homologação](documentacao/HOMOLOGACAO_BACKEND.md) e [de consolidação](documentacao/CONSOLIDACAO_BACKEND.md) identificam essas alternativas e seus registros anteriores. Planejamento de hospedagem, custos de provedor e escalabilidade fica para outra etapa.

Comprovantes são armazenados no PostgreSQL, junto ao pagamento, na mesma transação. Veja [migração e operação](documentacao/COMPROVANTES_POSTGRESQL.md) e os [tipos e exemplos para integração](integracao/README.md).

Na versão 2.1.0, o backend oferece suporte ao Google. Consulte o [guia de configuração e validação](documentacao/AUTENTICACAO_GOOGLE.md). A interface principal agora usa o design do PR #2 e ainda precisa incorporar o botão Google; a validação real com o provedor também depende do Client ID e das contas de teste.

## Integração do novo frontend

O design do [PR #2](https://github.com/Mirandaszx/projeto-Rephouse/pull/2) foi adotado na pasta `interface` e é servido em **http://localhost:5173**. O login está em `/login`, o cadastro em `/cadastro` e o painel em `/republica`. Os caminhos antigos com `/novo` redirecionam para os atuais. Ele usa o adaptador `/api/front/v1`; a API 2.1.0 em `/api` mantém a paginação. Consulte o [guia da interface](interface/README.md) e o [guia de integração](documentacao/INTEGRACAO_FRONTEND_PR2.md).
