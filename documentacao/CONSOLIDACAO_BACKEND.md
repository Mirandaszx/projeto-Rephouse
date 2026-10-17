# Consolidação do backend

A entrega anterior está preservada no commit `7781cfb`. Esta etapa fortalece o backend e prepara paginação e avaliação de crescimento. Por decisão do usuário, os commits ficam **somente locais**; push, PR e execução remota do GitHub Actions permanecem pendentes.

## Segurança e operação

Helmet adiciona os headers HTTP; HTTPS/HSTS público fica a cargo de uma implantação futura. Respostas da API usam `Cache-Control: no-store`. O servidor limita headers a 10 segundos, recebimento a 30 segundos e drenagem de encerramento a 15 segundos.

JWT exige identidade UUID, emissão, expiração e versão não negativa. Antes do processamento de comprovantes, a sessão é conferida no banco; a autorização é novamente validada na transação do pagamento. Uploads mantêm 5 MiB e no máximo dois processamentos simultâneos por instância, com `429 UPLOAD_BUSY` e `Retry-After: 1` quando saturados.

Falhas de escrita retornam `503 STORAGE_UNAVAILABLE` antes de iniciar o pagamento e tentam remover somente o arquivo criado por aquela operação. Erros estruturados de conexão e conflitos esgotados retornam 503; conflitos de domínio/financeiros retornam 409; entradas inválidas retornam 400. Mensagens SQL não são usadas para classificar erros. A migration adicional `202610170007_erros_dominio` mantém as regras existentes e acrescenta SQLSTATE `RH001` às exceções de domínio.

Logs de diagnóstico incluem categoria, código seguro e `requestId`, sem mensagem interna, SQL, stack ou entradas privadas. `npm run comprovantes:verificar` consulta referências e arquivos em modo somente leitura: informa pagamentos com arquivo ausente, arquivos sem referência e links ignorados. Não remove nada.

Backup/restauração usam trava exclusiva por projeto em `<diretório temporário do sistema>/rephouse-operacoes-docker`, compartilhada entre checkouts locais; outra operação concorrente é recusada. A trava é removida no `finally`. Após encerramento forçado, confira o PID e os containers antes de remover manualmente uma trava abandonada. O manifesto é validado antes da restauração e preserva compatibilidade com cópias anteriores sem fuso explícito, adotando Brasília.

## Ambiente de desenvolvimento

A API antiga foi recriada com a montagem da pasta atual. Antes disso, foram feitos dumps preventivos dos bancos selecionado e original em `copias-seguranca/pre-consolidacao`; o banco selecionado não possuía referências a comprovantes. PostgreSQL, volume existente e frontend não foram recriados. `health` e `ready` responderam 200 após a recuperação.

Uma regra ampla de `.gitignore` ignorava também `codigo/infraestrutura/armazenamento`. Ela foi limitada ao armazenamento de dados na raiz, para versionar o código de comprovantes e permitir checkout reproduzível.

Os resultados atuais estão em [validacao-consolidacao.json](evidencias/validacao-consolidacao.json) e [carga-consolidacao.json](evidencias/carga-consolidacao.json). A evidência anterior permanece preservada, identificada como etapa anterior.

## Contrato 2.0.0

Listagens de membros, despesas, tarefas, financeiro pessoal, usuários e repúblicas, inclusive MASTER, retornam `{dados,paginacao}`. Os parâmetros `pagina`/`limite` têm padrões 1/20, limite máximo de 100 e página máxima de 1.000.000 para manter offsets representáveis. Parâmetros inválidos, repetidos ou desconhecidos retornam 400. Página além do total retorna coleção vazia com os totais preservados. A consulta e a contagem compartilham autorização e transação; ordenações usam ID como desempate.

Esta é uma mudança incompatível aprovada antes da integração do frontend. OpenAPI, exemplos, testes e guia de integração foram atualizados. As demais operações mantêm seus contratos.

## Carga reproduzível

`npm run test:carga` executa o perfil curto de 100 contas, 10 repúblicas, 100 despesas, 200 tarefas e até 5 usuários virtuais por 30 segundos. `npm run test:carga:completo` cria 1.000 contas (incluindo um MASTER), 100 repúblicas, 10.000 despesas distribuídas por 12 meses e 2.000 tarefas. Os rateios e pagamentos incluem 40% de despesas quitadas, 30% parciais e 30% pendentes.

Os cenários são TypeScript, com checagem de tipos própria, e usam a imagem k6 fixada por digest em `docker-compose.carga.yml`. Cada execução cria projeto `rephouse-carga-<id>`, banco `rabbu_mvp_carga` e volumes novos. A preparação recusa banco não vazio e exige `NODE_ENV=test`; não altera os limites de autenticação nem cria endpoints de teste. Tokens são preparados localmente e ficam em `.devops-local/carga-<id>/atores.json`, fora do Git e dos logs.

No Linux, o container k6 recebe o UID/GID do operador para acessar a pasta 0700 e o arquivo de tokens 0600. Isso evita ampliar permissões para outros usuários. No Windows, o padrão é 1000:1000 e o acesso ao bind mount segue o Docker Desktop.

A [verificação de permissões](evidencias/permissoes-k6-linux.json) reproduziu em filesystem Linux a recusa ao UID original 12345 e executou o cenário TypeScript com UID/GID 1001, lendo a fixture privada e escrevendo o resumo. Este teste local não equivale à execução remota do workflow.

A API usa 2 CPUs/1 GiB e o PostgreSQL 2 CPUs/2 GiB, conferidos no Docker. O perfil completo sobe a 10, 25 e 50 usuários em etapas de 30 segundos, mantém 50 por cinco minutos e reduz a zero em 30 segundos. As iterações têm uma chamada e pausa de um segundo, com aproximadamente 80% de leituras e 20% de escritas permitidas pelo perfil. ADMIN edita metadados; NORMAL registra pequenos pagamentos próprios e conclui suas tarefas.

Metas: p95 de leituras menor que 750 ms, p95 de escritas menor que 1.500 ms, falhas inesperadas abaixo de 1%, zero HTTP 500 e zero violações de isolamento. O runner confere também soma de rateios, saldo/status, unicidade das chaves, quantidade de pagamentos confirmados e configurações ACID depois da carga. Não reduz isolamento nem desabilita constraints para melhorar resultados.

Resultados, amostras de CPU/memória e resumo k6 ficam no diretório privado de cada execução. Somente resumos sem tokens serão copiados para `documentacao/evidencias`. Se uma meta falhar, o comando retorna erro e registra `target_not_met`; falha de infraestrutura não é apresentada como capacidade validada. O `finally` remove apenas os recursos criados pelo ensaio. Use `CARGA_PORT` se a porta 3401 estiver ocupada. Não execute carga e recuperação simultaneamente ao medir desempenho.

O workflow regular ganhou o perfil curto; no acionamento manual, `carga_completa=true` inclui o ensaio maior. Nenhum workflow foi enviado ou executado no GitHub, respeitando a decisão de manter commits locais.

Quando houver autorização para publicar e executar a CI, ela guardará somente `resultado.json` e `resumo-k6.json` dos ensaios por 14 dias, inclusive em falha. Tokens, arquivos de ambiente e dumps ficam fora da seleção de artefatos.

## Resultados locais

A regressão completa passou com 93 testes (33 sem banco e 60 com PostgreSQL), sem falhas e sem ignorados. O ensaio Docker conferiu a requisição em andamento durante SIGTERM, replay sem duplicação, sete migrations, durabilidade, prontidão após queda/retorno do PostgreSQL e download do comprovante restaurado em outro cluster. A captura de backup também foi interrompida deliberadamente depois de parar a API: a trava recusou um segundo backup e a API reiniciou no `finally`, com dados e arquivo preservados. Diretórios de captura sem manifesto completo não são backups restauráveis.

Uma [instalação limpa](evidencias/checkout-consolidacao.json), exportada do commit `9fa3397` sem `.env`, `node_modules`, `dist` ou cliente Prisma gerado, passou em `npm ci` e `npm run verificar`: os mesmos 93 testes e contrato sincronizado. As variáveis do banco dedicado foram fornecidas somente ao processo. O ajuste posterior de UID/GID do runner foi validado por tipos, perfil curto e teste de permissões Linux.

O ensaio completo confirmou 16.499 requisições em aproximadamente sete minutos, com 39,25 requisições/s na média, 1.303 pagamentos confirmados e cinco minutos com 50 usuários virtuais. As verificações financeiras e de isolamento permaneceram sem inconsistências.

| Indicador | Medido | Meta |
| --- | --- | --- |
| p95 das leituras | 177,46 ms | abaixo de 750 ms |
| p95 das escritas | 219,47 ms | abaixo de 1.500 ms |
| Falhas inesperadas | 0% | abaixo de 1% |
| HTTP 500, violações de isolamento, pagamentos duplicados | 0 | 0 |

A meta foi aprovada neste cenário local e com os limites de recursos definidos. O JSON de evidência registra consumo amostrado de CPU/memória e os estados inicial/final; isso permite comparar futuras execuções, sem representar garantia para outra infraestrutura ou outro tráfego. Não foram necessárias alterações de índices para atingir as metas.

As referências utilizadas foram a [paginação do Prisma](https://www.prisma.io/docs/orm/fundamentals/reading-data), os [cenários TypeScript do k6](https://grafana.com/docs/k6/latest/using-k6/javascript-typescript-compatibility-mode/) e o [backup lógico do PostgreSQL 18](https://www.postgresql.org/docs/18/backup-dump.html). O projeto mantém a versão Prisma 7 fixada no lockfile; exemplos de versões posteriores da documentação não alteram a API utilizada aqui.
