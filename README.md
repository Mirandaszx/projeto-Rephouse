# RepHouse

Aplicação web para organização de repúblicas e residências compartilhadas.

O backend está na versão **2.0.1**: listagens retornam `{dados,paginacao}`, com `pagina=1` e `limite=20` por padrão. Veja o [guia de integração](documentacao/INTEGRACAO_BACKEND.md) e a [consolidação do backend](documentacao/CONSOLIDACAO_BACKEND.md) para segurança, contratos e ensaios de carga. A versão validada foi publicada em `homologacao`; essa branch reúne a integração antes de promover alterações para `main` por PR.

Para integrar conta, repúblicas, moradores, tarefas e MASTER, siga o [roteiro sem operações financeiras](documentacao/JORNADAS_INTEGRACAO.md). Ele inclui coleção Insomnia, exemplos fetch e demonstração isolada por `npm run integracao:demo`.

Para executar a API compilada em ambiente local persistente da equipe e entender os testes do GitHub, siga [HOMOLOGACAO_BACKEND.md](documentacao/HOMOLOGACAO_BACKEND.md).

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
república e exclusão lógica da própria conta. A interface React fica para a próxima etapa.
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

O Compose acima é para desenvolvimento. A execução compilada, somente com API e PostgreSQL, usa `Dockerfile` e `docker-compose.backend.yml`, com projeto/volumes próprios, migrations separadas e processo sem root. Consulte o [guia operacional](documentacao/OPERACAO_BACKEND.md) para execução, logs, readiness, backup e restauração isolada.

A [matriz de validação](documentacao/VALIDACAO_MVP.md) relaciona requisitos, implementação e evidências. O [roteiro de demonstração](documentacao/ROTEIRO_DEMONSTRACAO_BACKEND.md) inclui requisições e estado esperado no banco. `npm run test:devops` ensaia a recuperação em Docker; o workflow do GitHub executa a verificação sem publicar imagens nem fazer deploy. A execução remota só conta como validada depois de ocorrer no GitHub.

Comprovantes são armazenados no PostgreSQL, junto ao pagamento, na mesma transação. Veja [migração e operação](documentacao/COMPROVANTES_POSTGRESQL.md) e os [tipos e exemplos para integração](integracao/README.md).
