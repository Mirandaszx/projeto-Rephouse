# RepHouse

Aplicação web para organização de repúblicas e residências compartilhadas.

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

## Rodar com Docker

Copie `.env.example` para `.env`, configure o banco e execute `npm run auth:secret`
para gerar o segredo JWT local. O banco padrão desta versão é `rabbu_mvp`.
As migrations são aplicadas automaticamente antes da API iniciar.

A modelagem segue o documento **RABBU — MVP / Primeira Entrega (3 perfis)**.
São sete tabelas: usuários, repúblicas, membros, despesas, rateios, pagamentos e tarefas.
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

O Compose atual é para desenvolvimento. Antes de publicar, será necessário preparar imagens de produção, remover os volumes de código e configurar credenciais e segredos próprios do ambiente.

Os arquivos `.dockerignore` estão prontos para quando forem adicionados Dockerfiles. No modo atual, o Compose usa a imagem oficial do Node e volumes de desenvolvimento, então eles não alteram a execução local.
