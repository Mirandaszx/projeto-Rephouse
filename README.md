# RepHouse

Aplicação web para organização de repúblicas e residências compartilhadas.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS e ESLint
- Backend: Node.js e Express
- Banco de dados: PostgreSQL
- ORM planejado: Prisma (ainda não instalado)
- Ambiente local: Docker Compose

## Rodar com Docker

Com Docker Desktop aberto, na raiz do repositório:

```bash
docker compose up
```

Na primeira execução, o Compose baixa a imagem do Node e instala as dependências usando os arquivos de lock. A aplicação fica disponível em:

- Frontend: http://localhost:5173
- API: http://localhost:3000/api/health
- PostgreSQL: localhost:5432

O frontend encaminha chamadas `/api` para a API pelo proxy do Vite. Dentro da rede do Compose, a API encontra o banco pelo nome do serviço `postgres`.

Para parar os serviços sem apagar os dados do banco:

```bash
docker compose down
```

As credenciais têm valores padrão para desenvolvimento local e podem ser substituídas por variáveis em um arquivo `.env` na raiz. Não use esses valores padrão em produção.

O Compose atual é para desenvolvimento. Antes de publicar, será necessário preparar imagens de produção, remover os volumes de código e configurar credenciais e segredos próprios do ambiente.

Os arquivos `.dockerignore` estão prontos para quando forem adicionados Dockerfiles. No modo atual, o Compose usa a imagem oficial do Node e volumes de desenvolvimento, então eles não alteram a execução local.
