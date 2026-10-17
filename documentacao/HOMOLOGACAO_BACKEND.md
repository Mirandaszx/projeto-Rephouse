# Homologação local do backend e CI

A branch `homologacao` reúne as alterações para integração do frontend com a API antes de um PR para `main`. Cada integrante desenvolve em sua própria branch e abre PR para `homologacao`. Esta entrega prepara o backend e sua verificação: não cria telas, não hospeda a aplicação e não altera pagamentos. O contrato continua **2.0.1**.

## Preparar uma cópia local

Use Docker Desktop com Compose; para executar a regressão pelo computador, instale Node.js 24. Na raiz do repositório, com trabalho local já salvo, atualize a branch desejada sem sobrescrever alterações próprias:

```powershell
git fetch origin
git switch homologacao
git pull --ff-only origin homologacao
Copy-Item .env.backend.example .env.homologacao
```

Faça a cópia do arquivo somente na primeira preparação; não sobrescreva credenciais já configuradas. Preencha `.env.homologacao` com os valores abaixo. Use uma senha própria para o banco e um segredo JWT aleatório de pelo menos 32 caracteres (`npm ci` e `npm run auth:secret` geram um exemplo local). Não use credenciais reais da equipe e não envie o arquivo ao Git.

```dotenv
BACKEND_DB_USER=rephouse
BACKEND_DB_NAME=rabbu_mvp_homologacao
BACKEND_DB_PASSWORD=SENHA_LOCAL
BACKEND_DATABASE_URL=postgresql://rephouse:SENHA_LOCAL@postgres:5432/rabbu_mvp_homologacao?schema=public
BACKEND_JWT_SECRET=SEGREDO_LOCAL_ALEATORIO_COM_PELO_MENOS_32_CARACTERES
BACKEND_PORT=3403
BACKEND_TIME_ZONE=America/Sao_Paulo
BACKEND_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Codifique caracteres especiais do usuário/senha na URL. O host interno `postgres` deve ser preservado. As variáveis de inicialização do PostgreSQL só criam credenciais num volume novo; mudar o arquivo não altera a senha de um banco já inicializado.

```powershell
docker compose --env-file .env.homologacao -f docker-compose.backend.yml -p rephouse-homologacao up -d --build --wait api
Invoke-RestMethod http://127.0.0.1:3403/api/health
Invoke-RestMethod http://127.0.0.1:3403/api/ready
```

O projeto usa somente backend compilado, PostgreSQL e o serviço separado de migrations. A API roda sem root, sem bind mount e sem instalar ou compilar no startup. O PostgreSQL não publica porta no computador. O volume **`rephouse-homologacao_banco`** persiste os dados e não é compartilhado com o projeto de desenvolvimento. Não use volumes antigos para inicializar esta homologação.

Na primeira execução, as oito migrations são aplicadas, sem seed e sem contas preexistentes. Não é necessário instalar Node no computador para iniciar a imagem compilada. Os comandos TypeScript de desenvolvimento e a regressão pelo host continuam exigindo Node e dependências locais.

## Contas fictícias e jornadas

Importe `integracao/insomnia-jornadas.json` e ajuste `base_url` para **`http://127.0.0.1:3403`**, sem `/api`. Defina uma senha fictícia de 12 a 128 caracteres no ambiente local do Insomnia.

As sete contas do roteiro temporário não são criadas automaticamente neste banco persistente. Na primeira preparação, duplique a requisição **Cadastrar conta sem república** para cadastrar as contas abaixo. Altere `nome` e `email`; mantenha a senha fictícia definida em `senha`. Todas começam como NORMAL.

| Nome | E-mail |
| --- | --- |
| Responsável Aurora | `admin.aurora@integracao.rephouse.test` |
| Responsável Horizonte | `admin.horizonte@integracao.rephouse.test` |
| Ana | `ana@integracao.rephouse.test` |
| Bruno | `bruno@integracao.rephouse.test` |
| Carla | `carla@integracao.rephouse.test` |
| Excluir | `excluir@integracao.rephouse.test` |
| MASTER | `master@integracao.rephouse.test` |

O cadastro retorna `201`. Em uma repetição, e-mail já usado retorna `409` e não redefine senha nem restaura conta excluída. Preserve as credenciais fictícias da primeira preparação. Promova exclusivamente a conta MASTER da homologação usando o comando existente dentro do container:

```powershell
docker compose --env-file .env.homologacao -f docker-compose.backend.yml -p rephouse-homologacao exec -T api node dist/comandos/provision-master.js --email master@integracao.rephouse.test
```

Faça login novamente após provisionar MASTER: o comando revoga tokens anteriores. Não há cadastro público de contas privilegiadas. Os responsáveis passam a ADMIN quando criam Aurora e Horizonte pelas requisições normais da API.

Agora siga [JORNADAS_INTEGRACAO.md](JORNADAS_INTEGRACAO.md), desde o cadastro da oitava conta `novo@integracao.rephouse.test`, preenchendo tokens, códigos e IDs pelas respostas. Neste ambiente, os dados **permanecem** após sair ou reiniciar containers. Não repita cegamente operações de criação, transferência ou exclusão sobre a mesma fixture: confira o estado atual ou use novas contas fictícias. Não execute a seed financeira para preparar esta jornada.

Copie para o projeto consumidor os tipos e exemplos de `integracao/`, conforme seu README. Passe explicitamente `http://127.0.0.1:3403` como URL base nos exemplos fetch. Requisições diretas dessa forma usam as origens CORS configuradas; o proxy `/api` do Vite atual aponta para o serviço Docker `api` e não corresponde a este endereço externo. O responsável pelo frontend deverá configurar as chamadas de sua interface; esta entrega não altera os arquivos da interface.

## Reiniciar, atualizar e diagnosticar

```powershell
docker compose --env-file .env.homologacao -f docker-compose.backend.yml -p rephouse-homologacao ps -a
docker compose --env-file .env.homologacao -f docker-compose.backend.yml -p rephouse-homologacao logs --tail 100 api migracoes
docker compose --env-file .env.homologacao -f docker-compose.backend.yml -p rephouse-homologacao restart postgres api
docker compose --env-file .env.homologacao -f docker-compose.backend.yml -p rephouse-homologacao down
```

`down` preserva o volume. Para iniciar novamente ou incorporar alterações do código, repita `up -d --build --wait api`. Não remova volumes, edite migrations aplicadas ou execute reset para corrigir uma falha. Registre erros pelo padrão da rota, método, status, resposta esperada/recebida, versão do commit e `X-Request-Id`; omita tokens, senhas e dados pessoais. Confira banco/migrations antes de liberar uma atualização. Backup e restauração continuam no [guia operacional](OPERACAO_BACKEND.md), selecionando explicitamente projeto `rephouse-homologacao` e arquivo `.env.homologacao`.

Este ambiente é diferente de **`npm run integracao:demo`**: a demonstração usa o banco dedicado `rabbu_mvp_test`, cria um schema temporário, atende na porta 3402 e remove apenas esse schema ao encerrar. Não use as credenciais nem os IDs de uma sessão temporária no ambiente persistente.

## CI e resultados

O workflow valida pushes para `main`/`homologacao` e PRs destinados a essas branches. Usa Linux, Node 24, PostgreSQL 18 temporário, `npm ci`, migrations, regressão completa, contrato/tipos sincronizados e o ensaio Docker existente de recuperação. Mantém token com `contents: read` e publica somente os JSONs de resultado permitidos. Não publica imagem nem faz deploy. Alterações de frontend também passam pela regressão do backend; isso não substitui testes das telas.

As cargas curta e completa só são habilitadas por acionamento manual com `carga_completa=true`, que não será usado nesta entrega. Os testes financeiros existentes permanecem na regressão; nenhuma funcionalidade financeira é ampliada.

O acionamento manual depende da presença do workflow na branch padrão, conforme a [documentação do GitHub](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow). A primeira execução desta entrega será por PR para `homologacao`, sem alterar `main` e sem configurar proteção de branches.

Os resultados desta etapa estão em [validacao-homologacao.json](evidencias/validacao-homologacao.json), com execução local e remota separadas. O [PR #1](https://github.com/Mirandaszx/projeto-Rephouse/pull/1) permanece aberto para revisão, sem merge automático. A CI real aprovada e seu commit são identificados na evidência; os checks do PR mostram a execução mais recente. A integração com telas reais será conferida com o responsável pelo frontend.

Na máquina desta validação, o projeto persistente ficou iniciado na porta 3403. A senha das contas fictícias geradas para o ensaio está no arquivo local ignorado `.devops-local/homologacao-contas.env`; não foi incluída no Git ou no PR. A fixture já passou pelas operações de transferência, logout e exclusão descritas no roteiro, portanto seu estado atual não é o inicial.
