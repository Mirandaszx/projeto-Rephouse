<div align="center">
  <img src="interface/publico/rephouse.svg" width="72" height="72" alt="">
  <h1>RepHouse</h1>
  <p><strong>Organização de repúblicas e moradias compartilhadas</strong></p>
  <p><a href="#como-rodar-localmente">🚀 Como rodar</a> · <a href="#acesso-de-demonstração">🔑 Acesso de demonstração</a></p>
</div>

## 🏠 Sobre o projeto

O RepHouse reúne as tarefas e as contas da casa. Os moradores podem dividir despesas, registrar pagamentos, acompanhar tarefas e receber notificações em um só lugar.

| Parte | Tecnologias |
| --- | --- |
| Frontend | React, TypeScript e Vite |
| Backend | Node.js, Express, Prisma e PostgreSQL |

## Como rodar localmente

**🔧 Pré-requisitos** · Git, Node.js 24 com npm e Docker com Compose.

No Windows, abra o Docker Desktop e aguarde o motor de contêineres Linux iniciar. Os exemplos usam PowerShell.

### 1. Clone o repositório

```powershell
git clone https://github.com/Mirandaszx/projeto-Rephouse.git
cd projeto-Rephouse
```

Se já tiver um clone, abra o terminal na pasta que contém `docker-compose.yml`.

### 2. Configure o ambiente

Crie o `.env` a partir do modelo:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Em uma instalação nova, gere uma senha local e use o mesmo valor em `POSTGRES_PASSWORD` e na senha da `DATABASE_URL` inicial.

```powershell
node -e "console.log(require('node:crypto').randomBytes(24).toString('hex'))"
```

> Se o banco já estiver configurado, mantenha as credenciais existentes. Guarde o `.env` só no seu computador.

Instale as dependências e gere o segredo de sessão:

```powershell
npm ci
npm run auth:secret
```

### 3. Prepare o banco e inicie a aplicação

Na primeira execução, suba o PostgreSQL, aplique as migrações e configure a conta da API:

```powershell
docker compose up -d --wait postgres
docker compose --profile manutencao run --rm migracoes
docker compose --profile manutencao run --rm migracoes npm run db:permissoes -- --compose
```

O último comando configura a conta com permissões limitadas e atualiza o `.env`.

Inicie a aplicação e confira os serviços:

```powershell
docker compose up -d --wait postgres api frontend
docker compose ps
```

| Acesso | Endereço |
| --- | --- |
| Aplicação | [Abrir o RepHouse](http://localhost:5173/login) |
| API | [Verificar a saúde da API](http://localhost:3000/api/health) |

Na primeira execução, acompanhe a instalação das dependências do frontend com `docker compose logs --tail 30 frontend`.

### Acesso de demonstração

Em um banco local novo, defina `DEMO_PASSWORD` no `.env` com uma senha de 12 a 128 caracteres e carregue os dados fictícios:

```powershell
docker compose --profile manutencao run --rm migracoes npm run db:seed
```

Entre com `admin.aurora@demo.rephouse.test` e a senha escolhida. Para habilitar o cadastro por e-mail, siga as variáveis comentadas no [`.env.example`](.env.example).

### 🔄 Uso diário

| Ação | Comando |
| --- | --- |
| Iniciar | `docker compose up -d --wait postgres api frontend` |
| Parar e preservar os dados | `docker compose stop` |
