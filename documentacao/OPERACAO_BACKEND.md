# Operação local do backend

Na terceira apresentação, use o Compose principal com frontend, API e PostgreSQL. A versão permanece **2.1.0**. A validação exigida é compilação, tipos, contrato e testes funcionais; carga, recuperação e demonstração de backup/restauração são opcionais. Não é necessário preparar homologação separada ou planejar produção.

## Caminho principal: Docker local

Na raiz, com Docker Desktop iniciado, prepare `.env` somente se ele ainda não existir: copie `.env.example`, configure as credenciais do banco e preencha `JWT_SECRET` com um segredo aleatório de pelo menos 32 caracteres. `npm run auth:secret`, após `npm ci`, fornece um valor para copiar ao arquivo; não o publique. Não sobrescreva um `.env` já configurado nem tente trocar credenciais de um volume existente pelas variáveis de inicialização.

```powershell
docker compose up -d --wait
docker compose ps -a
Invoke-RestMethod http://localhost:3000/api/health
Invoke-RestMethod http://localhost:3000/api/ready
```

Abra `http://localhost:5173/login`. O Compose instala pelo lockfile, aplica migrations e inicia API e frontend. O PostgreSQL usa o volume `postgres_data` do projeto; contas, vínculos, tarefas e comprovantes persistem após reinício. Para diagnosticar, reiniciar ou encerrar:

```powershell
docker compose logs --tail 100 api frontend postgres
docker compose restart api frontend
docker compose down
```

`down` preserva os dados; `down -v` remove volumes e não faz parte do procedimento. Não execute reset ou limpeza de volumes. O [README](../README.md#testes-locais-e-github-actions) contém os comandos da regressão no PostgreSQL dedicado, sem escrever no banco da equipe.

## GitHub Actions da entrega

O workflow `backend.yml` executa em pushes e PRs para `main` e `homologacao`, além do acionamento manual sem parâmetros de carga. Usa Linux, Node.js 24, PostgreSQL 18 temporário, `npm ci`, migrations, `npm run verificar` e comparação do OpenAPI e dos tipos versionados. Mantém permissões de leitura e os testes financeiros e unitários operacionais existentes.

Nenhum evento executa carga, recuperação, backup/restauração, publicação de artefatos dos ensaios ou deploy. Os testes de navegador são executados localmente. Uma checagem local do workflow não comprova execução no GitHub; evidências remotas anteriores continuam vinculadas aos respectivos commits.

## Alternativas operacionais preservadas (opcionais)

As seções seguintes documentam recursos de etapas anteriores, fora das exigências da terceira apresentação. Seus comandos são manuais e não são chamados pelo Actions atual. Dockerfile, configurações alternativas, scripts e evidências foram preservados. O [ambiente de homologação](HOMOLOGACAO_BACKEND.md) é outra opção, sem necessidade de preparar ou alterar seus volumes nesta entrega.

### API compilada: preparar e iniciar (opcional)

Requisitos: Docker com Compose e acesso ao registro de imagens. Para os comandos TypeScript de verificação e backup, instale Node.js 24 e execute `npm ci` na raiz. A API compilada não depende do Node, código ou `node_modules` do host.

```powershell
Copy-Item .env.backend.example .env.backend
```

Preencha `BACKEND_DB_PASSWORD`, `BACKEND_DATABASE_URL` e `BACKEND_JWT_SECRET`. Gere um segredo com `npm run auth:secret`. O usuário e a senha da URL devem corresponder aos do PostgreSQL, com caracteres especiais codificados para URL; o host interno é `postgres`. Não versione `.env.backend`. A API só publica a porta local `127.0.0.1:3001`; o banco não publica porta no host.

```powershell
docker compose --env-file .env.backend -f docker-compose.backend.yml -p rephouse-validacao up -d --build --wait api
Invoke-RestMethod http://localhost:3001/api/health
Invoke-RestMethod http://localhost:3001/api/ready
```

O build usa `npm ci`, gera o cliente Prisma e compila TypeScript. O serviço `migracoes` executa somente `prisma migrate deploy`, depois do PostgreSQL saudável e antes da API. A API executa `node dist/server.js` como UID 1000, sem instalar ou compilar no startup. A imagem usa etapas separadas para ferramentas e runtime. As migrations versionadas incluem os comprovantes transacionais e a autenticação Google; migrations já aplicadas permanecem intactas. Não há reset.

`APP_TIME_ZONE` define datas civis e o mês dos indicadores; seu padrão é **horário de Brasília**, `America/Sao_Paulo`. No Compose compilado, configure `BACKEND_TIME_ZONE`; no desenvolvimento, `APP_TIME_ZONE`. Datas civis enviadas como `YYYY-MM-DD` continuam sendo datas, sem conversão pelo navegador. A escolha de referência nacional não presume que todo o Brasil tenha o mesmo fuso.

### API compilada: persistência e diagnóstico

O volume `rephouse-validacao_banco` persiste registros e comprovantes. A API não depende de volume de arquivos; volumes legados permanecem preservados. Alterar `-p` cria outro projeto e outros volumes. Não use os nomes do projeto de desenvolvimento para ensaios de recuperação. Alterar a senha no arquivo não altera a senha de um cluster PostgreSQL já inicializado.

```powershell
docker compose --env-file .env.backend -f docker-compose.backend.yml -p rephouse-validacao ps -a
docker compose --env-file .env.backend -f docker-compose.backend.yml -p rephouse-validacao logs --tail 100 migracoes api
docker compose --env-file .env.backend -f docker-compose.backend.yml -p rephouse-validacao restart postgres api
docker compose --env-file .env.backend -f docker-compose.backend.yml -p rephouse-validacao down
```

`down` preserva volumes; `down --volumes` remove dados e não faz parte do procedimento normal. Não recrie volumes para resolver credenciais ou migrations. Após alteração no código, reconstrua a imagem com o comando de início.

`GET /api/health` mantém `200 {"status":"ok"}` enquanto o processo responde. `GET /api/ready` consulta `SELECT 1` e retorna `200 {"status":"ok"}` ou `503 {"status":"unavailable"}` com orçamento inferior a dois segundos. O pool dedicado usa uma conexão e limites de conexão, consulta e statement; não ocupa a fila transacional. A sondagem não divulga o motivo interno da indisponibilidade.

Os logs HTTP vão para stdout em JSON, com `timestamp`, `event`, `requestId`, `method`, `path`, `status` e `durationMs`. A resposta devolve o mesmo UUID em `X-Request-Id`, também exposto por CORS. O caminho é o padrão registrado (`/api/despesas/{id}`); caminhos desconhecidos viram `unmatched`. Query strings, identificadores enviados pelo cliente, bodies, headers, credenciais e conteúdo dos comprovantes não são registrados. Conexões interrompidas antes do término são registradas como 499.

### Backup manual (opcional, fora da apresentação)

Execute na raiz, com banco e API da configuração escolhida já iniciados:

```powershell
npm run backup -- rephouse-validacao .env.backend backend
```

Para o Compose de desenvolvimento, informe explicitamente o projeto que o criou e seu arquivo de ambiente:

```powershell
npm run backup -- projeto-rephouse .env desenvolvimento
```

O comando verifica os containers e o inventário de comprovantes, captura versão e fuso, para a API e executa pg_dump -Fc --create. O dump inclui registros e comprovantes; o manifesto é formato 2. O finally reinicia a API inclusive em falha; a trava exclusiva por projeto é mantida. Não faça gravações diretas durante a captura. A importação legada deve estar concluída antes do backup.

Cada pasta `copias-seguranca/<data>-<identificador>/` contém:

| Arquivo | Conteúdo |
| --- | --- |
| `banco.dump` | Dump customizado, com dados, comprovantes, esquema e configuração do banco |
| `manifesto.json` | Data UTC, versão da aplicação, ID da imagem, projeto, banco, usuário, fuso e SHA-256 do dump |

A pasta fica fora do Git e do contexto Docker. Ela contém dados pessoais e hashes de senha: mantenha-a em armazenamento privado. O manifesto não contém senha, JWT ou URL de conexão. Só existe manifesto após terminar a captura; uma pasta parcial sem manifesto não é uma cópia utilizável. Uma falha ao reiniciar a API é erro do comando e exige diagnóstico. Encerramento forçado do processo ou do Docker pode impedir o `finally`; nesse caso, confira `ps` e inicie a API manualmente. Não há limpeza automática de cópias.

O formato customizado é restaurado por `pg_restore`, conforme a [documentação oficial do PostgreSQL 18](https://www.postgresql.org/docs/18/backup-dump.html). Não se trata de snapshot físico, réplica ou recuperação contínua de WAL. As únicas roles necessárias neste ambiente local são o usuário definido no Compose; roles externas adicionais não são exportadas por `pg_dump`.

### Restauração e ensaio de recuperação (opcionais)

Prepare um segundo arquivo de ambiente, mantendo nome do banco, usuário e fuso do manifesto, com nova senha, URL interna correspondente e porta livre, por exemplo `3302`. Use a mesma versão de imagem da captura ou uma versão cuja migração tenha sido revisada. Construa as imagens antes da restauração se ainda não estiverem disponíveis.

```powershell
Copy-Item .env.backend .env.restauracao
# Edite .env.restauracao: nova senha/URL e BACKEND_PORT=3302.
npm run restaurar -- rephouse-restauracao-ensaio copias-seguranca/PASTA_DA_COPIA .env.restauracao
Invoke-RestMethod http://localhost:3302/api/ready
```

O destino precisa ter prefixo `rephouse-restauracao-` e não possuir nenhum container, inclusive parado, nem volume com seu rótulo de projeto. A ferramenta nunca restaura sobre o projeto de origem. Valida hashes, cria um cluster isolado inicialmente com o banco `postgres` e usa `pg_restore --exit-on-error --create` para recriar o banco original e suas configurações. Aceita formatos 1 e 2. No formato 1, recusa caminhos inesperados e links no tar e importa os arquivos em área temporária exclusiva antes de liberar a API. Restaura o fuso registrado, executa `ANALYZE`, aplica migrations pendentes pelo serviço separado e inicia a API. Uma falha deixa somente o destino isolado para diagnóstico; a origem não é alterada.

Confira login, valores de despesas e rateios, histórico e download privado de comprovantes. O ensaio automatizado abaixo confere também os registros no PostgreSQL, a soma de pagamentos, as regras financeiras e `serializable`, `synchronous_commit`, `fsync` e `full_page_writes`.

```powershell
npm run test:devops
```

O comando constrói ambas as imagens, cria quatro projetos aleatórios, usa senhas novas e as portas locais 3301/3302/3303, gera fixtures com os três perfis e histórico e envia um comprovante pela API. Compara o estado antes/depois do restart e da restauração, verifica download por SHA-256, indisponibilidade do banco e logs. Recusa sobrepagamento pela API e diretamente no banco restaurado. Por fim, remove **somente os projetos e volumes criados pelo ensaio**. Mantém backup e evidência em `.devops-local/<id>/resultado.json`. Portas alternativas podem ser informadas em `DEVOPS_PORT` e `DEVOPS_RESTORE_PORT`; a restauração legada usa a porta seguinte à DEVOPS_RESTORE_PORT. Não execute ensaios concorrentes nas mesmas portas.

## Evidências anteriores

O workflow de etapas anteriores incluía `npm run test:devops`; isso descreve somente a configuração histórica. A configuração atual é a da seção GitHub Actions acima, sem esse ensaio nem carga em qualquer evento.

Referências técnicas: [build em múltiplas etapas do Docker](https://docs.docker.com/build/building/multi-stage/), [serviço PostgreSQL no Actions](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers), [checkout](https://github.com/actions/checkout) e [setup-node](https://github.com/actions/setup-node).

`npm run verificar` exige `TEST_DATABASE_URL` para o banco dedicado e não aceita a ausência de integração como sucesso. O ensaio Docker usa seus próprios bancos e não depende do PostgreSQL do host.

As [evidências e pendências](VALIDACAO_MVP.md) registram os resultados locais separadamente da execução no GitHub. Os registros de homologação e ensaios anteriores são históricos e não validam uma versão posterior do workflow.

A [consolidação do backend](CONSOLIDACAO_BACKEND.md) preserva os resultados e os comandos manuais de carga; o parâmetro `carga_completa` foi retirado do workflow. Backup/restauração mantêm trava exclusiva e validação de manifesto. `npm run comprovantes:verificar` continua disponível para inspeção sem exclusões. O [guia de comprovantes](COMPROVANTES_POSTGRESQL.md) registra importação, compatibilidade e recuperação opcionais. Nenhum desses ensaios é necessário para a apresentação.
