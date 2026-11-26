# RepHouse

Para a demonstração isolada de Kubernetes, Kibana e segurança, consulte [DevOps local](infra/devops/README.md). Esse ambiente tem banco próprio e não substitui o caminho de desenvolvimento abaixo.

Sistema para organizar moradores, tarefas e despesas de uma república. A versão **4.2.0** inclui rateios, pagamentos manuais, recorrências, notificações, perfil com foto e autenticação por e-mail.

Este guia explica a primeira configuração no **Windows, usando PowerShell e Docker Desktop**. Execute os passos na ordem. Se um comando falhar, resolva o erro antes de continuar.

> **Clonar o projeto não copia o banco nem o `.env` de outra pessoa.** Cada integrante prepara seu próprio ambiente. Contas criadas no computador de um colega não aparecem automaticamente no seu.

## 1. Confira o que precisa estar instalado

- **Git**, para baixar e atualizar o código.
- **Node.js 24**, com npm, para os comandos de configuração e desenvolvimento.
- **Docker Desktop**, aberto e executando containers Linux. No Windows, conclua a configuração do WSL 2 solicitada pelo Docker.
- **VS Code**, recomendado para editar os arquivos.

Abra o terminal do VS Code em **Terminal > Novo Terminal**. Os exemplos abaixo usam PowerShell.

```powershell
git --version
node --version
npm --version
docker compose version
docker info --format '{{.ServerVersion}}'
```

Cada comando deve mostrar uma versão; `node --version` deve começar com `v24.`. O último confirma que o Docker está funcionando, além de instalado.

Se o PowerShell bloquear `npm.ps1`, use `npm.cmd` no lugar de `npm` neste guia. Não é necessário desativar a proteção do Windows.

## 2. Baixe a branch que contém estas atualizações

Para quem **ainda não baixou o projeto**:

```powershell
git clone --branch teste-devops https://github.com/Mirandaszx/projeto-Rephouse.git
cd projeto-Rephouse
```

Para quem **já tem uma cópia**, abra essa pasta e confira primeiro `git status`. Preserve suas alterações antes de trocar de branch. Se estiver sem alterações pendentes:

```powershell
git fetch origin
git switch teste-devops
git pull --ff-only origin teste-devops
```

Confira onde está:

```powershell
git branch --show-current
Get-Item package.json, docker-compose.yml, .env.example
```

A branch esperada é `teste-devops`. A pasta desses três arquivos é a **raiz do projeto**. Todos os comandos seguintes partem dela, sem entrar em `interface`.

## 3. Crie seu `.env`: este passo é obrigatório

O `.env.example` é um **modelo**. O `.env` guarda a configuração usada no seu computador. O projeto não cria essa cópia automaticamente.

```powershell
if (!(Test-Path .env)) {
    Copy-Item .env.example .env
} else {
    Write-Host 'O .env já existe. Confira o conteúdo sem sobrescrevê-lo.'
}
```

No explorador do VS Code, abra o arquivo chamado **exatamente `.env`**, na mesma pasta do `package.json` da raiz.

- Não use `.env.txt`.
- Não coloque esse arquivo dentro de `interface`.
- Não altere apenas o `.env.example`: isso não configura sua execução.
- Não envie seu `.env` ao GitHub, ao grupo ou em capturas. Ele está ignorado pelo Git.

## 4. Configure a senha do seu banco local

**Em uma instalação nova**, gere uma senha sem caracteres que precisem ser escapados na URL:

```powershell
node -e "console.log(require('node:crypto').randomBytes(24).toString('hex'))"
```

Copie o resultado e use **a mesma senha nos dois lugares** abaixo, dentro do `.env`. Substitua `COLE_A_SENHA_GERADA`; não deixe esse texto como valor.

```dotenv
POSTGRES_DB=rabbu_mvp
POSTGRES_USER=gabrisel
POSTGRES_PASSWORD=COLE_A_SENHA_GERADA
DATABASE_URL=postgresql://gabrisel:COLE_A_SENHA_GERADA@localhost:5432/rabbu_mvp?schema=public
API_DB_USER=rephouse_api
API_DB_PASSWORD=
JWT_SECRET=
```

Essas linhas já existem no modelo: **edite as existentes, sem duplicá-las**. Preserve também:

```dotenv
NODE_ENV=development
APP_TIME_ZONE=America/Sao_Paulo
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Salve com **Ctrl+S**. `gabrisel` é o usuário técnico PostgreSQL usado pelo modelo, não uma conta de login do site. `rabbu_mvp` é o nome técnico do banco; mantenha-o neste procedimento.

| Variável | Para que serve | O que fazer |
|---|---|---|
| `POSTGRES_PASSWORD` | Senha administrativa do PostgreSQL local | Preencher com a senha gerada. |
| `DATABASE_URL` | Endereço de conexão com o banco | Na primeira preparação, repetir a mesma senha e manter `localhost:5432`. |
| `JWT_SECRET` | Protege as sessões do RepHouse | O próximo comando gera automaticamente. |
| `API_DB_PASSWORD` | Senha da conta limitada da API | O passo 8 gera automaticamente. |

**Se já possui banco com dados, preserve as credenciais existentes.** Trocar `POSTGRES_PASSWORD` no arquivo não troca a senha de um PostgreSQL salvo no volume. Não apague o volume para contornar uma senha desconhecida.

## 5. Instale as dependências e gere o segredo de sessão

Na raiz:

```powershell
npm ci
npm run auth:secret
```

`npm ci` instala as versões do lockfile. `auth:secret` preenche `JWT_SECRET` **diretamente no `.env`**, sem mostrar o segredo no terminal. Se já estiver preenchido, preserva o valor.

Resultado esperado: `JWT_SECRET configurado no .env local.` ou `JWT_SECRET já está configurado; nenhuma alteração foi feita.`

## 6. Ligue somente o PostgreSQL

Com o Docker Desktop aberto:

```powershell
docker compose config --quiet
docker compose up -d --wait postgres
docker compose ps
```

O primeiro comando verifica a configuração do Compose sem imprimir os segredos. Ele não substitui a conferência do `.env`.

O serviço `postgres` precisa aparecer como **healthy**. Não inicie a API ainda: o banco precisa receber as tabelas e permissões primeiro.

## 7. Crie as tabelas e aplique as migrations

Na primeira instalação, no **seu banco local de desenvolvimento**:

```powershell
docker compose --profile manutencao run --rm migracoes
```

Esse comando instala as dependências Linux do backend, gera o cliente Prisma e aplica as migrations. O download inicial pode levar alguns minutos. Aguarde terminar com sucesso.

Resultado esperado: migrations aplicadas ou a informação de que não existem migrations pendentes. A versão atual contém **26 migrations**.

`--rm` remove somente o container temporário de manutenção. **Não remove o banco nem seu volume.**

Se o banco já contém dados da equipe, confira o destino e obtenha autorização antes de aplicar migrations novas. Não execute `migrate reset` como parte da instalação.

## 8. Crie a conta limitada da API

```powershell
docker compose --profile manutencao run --rm migracoes npm run db:permissoes -- --compose
```

Esse passo também é obrigatório. Ele separa a conta administrativa da conta que atende o site e **atualiza automaticamente seu `.env`**:

- `MIGRATIONS_DATABASE_URL` guarda o endereço administrativo para manutenção.
- `API_DB_PASSWORD` recebe a senha técnica gerada.
- `DATABASE_URL` passa a usar a conta limitada `rephouse_api`.

Resultado esperado: `Conta limitada provisionada; DATABASE_URL separada da credencial administrativa.`

**Não volte `DATABASE_URL` para o valor do passo 4 depois disso.** A mudança é esperada. O Compose usa `postgres` como endereço interno; os comandos executados no Windows usam `localhost`.

## 9. Prepare um acesso de demonstração, se não configurou e-mail

Um banco novo começa sem usuários. O cadastro normal exige confirmação por e-mail. **Sem configurar o Resend, você pode abrir o site, mas não concluir um novo cadastro pelo formulário.**

Para desenvolver em uma instalação local nova, use as contas fictícias previstas no projeto. No `.env`, preencha `DEMO_PASSWORD` com uma senha escolhida por você, de **12 a 128 caracteres**. Salve e execute:

```powershell
docker compose --profile manutencao run --rm migracoes npm run db:seed
```

O comando cria duas repúblicas e dados fictícios de moradores, despesas, pagamentos e tarefas. Não envia e-mail. As contas abaixo usam a `DEMO_PASSWORD` definida **na primeira execução**:

| E-mail de demonstração | Acesso |
|---|---|
| `admin.aurora@demo.rephouse.test` | Administrador da República Aurora |
| `ana@demo.rephouse.test` | Moradora da República Aurora |
| `master@demo.rephouse.test` | Painel MASTER |

Use essas contas em **Entrar**, com e-mail e senha; não tente confirmar esses endereços fictícios por e-mail.

O seed preserva uma demonstração completa já existente e não troca suas senhas ao executar novamente. Ele acrescenta registros: **não execute esse passo no banco de outra pessoa ou no principal compartilhado sem combinar com a equipe**.

Se vai usar cadastro e e-mails reais, pode pular o seed e configurar o Resend na seção própria abaixo.

## 10. Ligue a API e o frontend

Depois de concluir as etapas anteriores:

```powershell
docker compose up -d --wait api frontend
docker compose ps
```

`postgres` e `api` devem aparecer como **healthy**; `frontend` deve estar em execução. Na primeira vez, o frontend ainda pode estar instalando dependências. Acompanhe:

```powershell
docker compose logs -f --tail 30 frontend
```

Quando aparecer a mensagem do Vite com a porta `5173`, o frontend estará pronto. **Ctrl+C sai dos logs; os containers continuam ligados.**

Confira a API:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
Invoke-RestMethod http://localhost:3000/api/ready
```

Ambas devem responder com `status: ok`. A primeira verifica o processo; a segunda confirma a disponibilidade do banco para a API.

Abra **[http://localhost:5173/login](http://localhost:5173/login)** na barra de endereço do navegador, não no campo de pesquisa do Google.

| Endereço | O que abre |
|---|---|
| `http://localhost:5173/login` | Login do RepHouse |
| `http://localhost:5173/cadastro` | Cadastro com confirmação por e-mail |
| `http://localhost:3000/api/health` | Saúde do processo da API |
| `http://localhost:3000/api/ready` | Disponibilidade do banco para a API |
| `http://localhost:3000/api/openapi.json` | Contrato da API |

## Nos próximos dias: iniciar, parar e atualizar

Você **não precisa recriar o `.env`, gerar novas senhas ou repetir o seed a cada uso**.

Para ligar o ambiente já preparado:

```powershell
docker compose up -d --wait postgres api frontend
```

Para parar mantendo os dados:

```powershell
docker compose stop
```

`docker compose down` também preserva o volume. **Não use `down -v`, reset ou limpeza de volumes** no procedimento diário: isso pode apagar os dados.

Se editar o `.env` com os serviços ligados, recrie a API para carregar as variáveis novas:

```powershell
docker compose up -d --no-deps --force-recreate --wait api
```

Somente `docker compose restart api` não atualiza as variáveis definidas pelo Compose.

Depois de receber código novo, confira as instruções da alteração. Se houver dependências novas, pare a API, repita o passo 7 no destino autorizado, atualize as permissões quando necessário e ligue a API novamente. Não presuma que `git pull` executa migrations ou instala pacotes dentro dos containers.

### Atenção ao ambiente já preparado neste computador

O roteiro principal é para uma cópia nova. Neste checkout, a execução atual usa um override **local, fora do Git**, que fixa a API compilada 4.2.0. Outros integrantes não precisam desse arquivo para a instalação nova.

Somente para manter esse ambiente existente, use:

```powershell
docker compose --env-file .env -f docker-compose.yml -f .devops-local/principal-estavel.yml -p projeto-rephouse up -d --wait postgres api frontend
```

Use os mesmos arquivos `-f` ao recriar seus serviços. Não copie esse comando para uma instalação sem o override e a imagem local correspondente.

## Configurar cadastro real e link mágico (Brevo ou Resend)

Para o deploy sem domínio próprio, use o **Brevo** (grátis, 300 e-mails por dia, pode cair no spam): `BREVO_API_KEY`, `EMAIL_FROM` com um remetente verificado no Brevo e `APP_PUBLIC_URL`. O passo a passo está em [AUTENTICACAO_EMAIL.md](documentacao/AUTENTICACAO_EMAIL.md). Configure só um provedor por vez. O restante desta seção descreve o Resend.

Para testar o frontend, as contas de demonstração são suficientes. Para enviar mensagens reais, cada ambiente precisa de uma configuração de e-mail autorizada.

No `.env` da raiz, configure **as três variáveis juntas**:

```dotenv
RESEND_API_KEY=COLE_SOMENTE_A_SUA_CHAVE
EMAIL_FROM=onboarding@resend.dev
APP_PUBLIC_URL=http://localhost:5173
```

O bloco é um exemplo: substitua a chave pelo token real, que começa com `re_`. Não use `VITE_RESEND_API_KEY`, não coloque a chave no frontend e não a envie em chat ou commit.

- Com `onboarding@resend.dev`, o envio é restrito ao destinatário associado à conta Resend. Para outros destinatários, configure um domínio verificado e um remetente desse domínio.
- `APP_PUBLIC_URL` deve coincidir com a origem usada no navegador e estar em `CORS_ORIGINS`.
- Depois de salvar, recrie a API conforme a seção anterior.
- O cadastro só cria a conta após clicar no link recebido e depois em **Confirmar e entrar**, no mesmo navegador que iniciou a solicitação. O link expira em dez minutos.
- Um link para `localhost` aberto no celular aponta para o próprio celular. Neste ambiente local, conclua o fluxo no computador que iniciou o cadastro.

Não é preciso copiar uma chave de outro integrante para usar a demonstração local.

## Quero trabalhar somente no frontend

Você pode editar `interface/codigo` com o Docker ligado; o Vite do container acompanha as alterações. Para usar o Vite diretamente no Windows, mantenha API e PostgreSQL no Docker, libere a porta do frontend e execute na raiz:

```powershell
docker compose stop frontend
npm --prefix interface ci
npm --prefix interface run dev
```

Mantenha esse terminal aberto. O endereço continua sendo `http://localhost:5173`. Não execute os dois frontends simultaneamente na mesma porta. As chamadas `/api` usam o proxy do Vite; não copie o `.env` administrativo para `interface`.

## Problemas comuns e como identificar a causa

| O que aconteceu | O que conferir |
|---|---|
| `.env` inexistente ou variável ausente | Faça o passo 3, edite o arquivo da raiz e salve. `.env.example` não substitui `.env`. |
| Erro de `JWT_SECRET` | Execute `npm run auth:secret` e recrie a API para carregar o valor. |
| Erro ao conectar ao Docker ou referência a `dockerDesktopLinuxEngine` | Abra o Docker Desktop e aguarde o Engine. Confira o último comando do passo 1. |
| Terminal não encontra `package.json` ou a configuração Compose | Você não está na raiz. Abra a pasta que contém `package.json` e `docker-compose.yml`. |
| Autenticação PostgreSQL recusada | Confira a correspondência da senha e da URL. Se já havia volume, preserve as credenciais com que ele foi criado. |
| Tabela ausente na API | As migrations não foram aplicadas nesse banco. Confira o destino e o passo 7. |
| Falta de permissão ou senha técnica vazia | Confira o passo 8. Não substitua a conta limitada pela administrativa na API. |
| Erro sobre `codigo/gerado/prisma` ou dependência ausente na API | Confira se o passo 7 terminou com sucesso antes de iniciar a API. |
| Porta `5432`, `3000` ou `5173` ocupada | Pode haver outro PostgreSQL, Vite ou projeto Docker ligado. Identifique o processo antes de mudar as portas. |
| Frontend iniciado, mas a página não abre | Confira os logs: a instalação inicial de pacotes pode não ter terminado. |
| A página abre, mas o cadastro está indisponível | Falta configurar as três variáveis de e-mail. Para desenvolvimento sem e-mail, use o passo 9. |
| Login de um colega não funciona no seu computador | Os bancos são independentes. Use as contas criadas no seu ambiente. |
| E-mail não chega | Confira remetente, destinatário permitido e spam. O remetente de teste não envia para qualquer pessoa. |
| Link do e-mail abre erro de conexão no celular | `localhost` no celular não é seu computador. Siga a orientação do fluxo local. |
| API não reflete uma nova dependência | Atualize as dependências onde o processo roda; instalar no Windows não atualiza o volume Linux do container. |

Para investigar:

```powershell
docker compose ps -a
docker compose logs --tail 60 api
docker compose logs --tail 60 frontend
docker compose logs --tail 30 postgres
```

Ao pedir ajuda, informe **qual passo falhou, o comando e a mensagem de erro**, removendo senhas, tokens e URLs com credenciais. Não mande o `.env` inteiro.

## Testes: use o banco dedicado

Os testes têm um PostgreSQL próprio: `rabbu_mvp_test`, porta **5544**. Não aponte os testes para o banco usado no site.

Com as dependências da raiz instaladas e Docker Desktop aberto:

```powershell
npm run test:completo
```

O comando prepara somente o banco dedicado, executa build, tipos, contrato e os testes do backend em schemas temporários. Não troca o `.env` da aplicação nem remove seu banco local.

Para a suíte do frontend:

```powershell
npm --prefix interface ci
docker compose -f interface/docker-compose.test.yml up -d --wait postgres
npm --prefix interface run verificar
```

No Windows, os testes de navegador usam Microsoft Edge por padrão. Não precisam de conta real nem da chave Resend: usam dados fictícios e integração externa controlada.

**Últimos resultados completos registrados:** 337 testes do backend aprovados; frontend com 104 aprovações e três falhas em investigação. As jornadas de perfil passaram. Esses números são registros anteriores, não garantia de aprovação integral em uma nova execução.

O GitHub Actions valida pushes e PRs para `main` e `homologacao`, além do acionamento manual. Usa banco temporário, confere o backend e a sincronização de `documentacao/openapi.json` com `integracao/api.d.ts`. O workflow atual não faz deploy.

## Referência rápida

| Parte | Tecnologia / localização |
|---|---|
| Interface | React, TypeScript, Vite e Tailwind; pasta `interface` |
| API | Node.js 24, Express e TypeScript; pasta `codigo` |
| Banco | PostgreSQL 18 com Prisma; pasta `prisma` |
| Contrato gerado | `documentacao/openapi.json` |
| Tipos de integração | `integracao/api.d.ts` |
| Ambiente local | `docker-compose.yml` |

O backend é um monólito modular em camadas. As operações financeiras usam transações ACID; os pagamentos são registros manuais, sem processamento bancário. Fotos e comprovantes ficam no PostgreSQL e exigem autenticação para acesso.

O Git compartilha código e migrations. **Ele não sincroniza usuários, despesas, fotos, arquivos `.env` ou volumes PostgreSQL entre computadores.** Os dados persistem no volume local após reiniciar os containers.

Scripts de backup, restauração, carga e ambientes alternativos continuam no repositório. Não fazem parte da primeira instalação deste guia e não precisam ser executados para trabalhar no frontend.
