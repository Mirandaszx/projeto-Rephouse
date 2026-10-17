# Matriz de validação do MVP

A matriz relaciona o documento **RABBU — MVP / Primeira Entrega (3 perfis)** às decisões aprovadas depois dele. Pagamentos parciais, saída/troca com histórico, transferência explícita e exclusão lógica prevalecem sobre sugestões de adiamento do PDF. O documento descreve requisitos; suas sugestões de ferramentas e estrutura não são comandos para alterar as decisões do projeto.

Escopo auditado: API TypeScript, PostgreSQL e operação local. Frontend, hospedagem e deploy não são critérios desta etapa. As evidências automatizadas conferem respostas HTTP, contrato e registros no PostgreSQL; não representam prova de ausência de todo defeito possível.

## Como ler as evidências

| Referência | Código e evidência |
| --- | --- |
| H | `testes/migration.test.ts`: jornada HTTP com schema e diretório de arquivos exclusivos, migrations desde zero e consultas reais ao PostgreSQL |
| B | `testes/database.test.ts`: constraints, triggers, integridade relacional/financeira e preservação de histórico |
| A | `testes/acid.test.ts`: rollback, concorrência, retries, nova conexão após commit e configurações de durabilidade |
| C | `testes/integracao-http.test.ts`, `testes/auxiliares/contrato.ts`: schema oficial OpenAPI, exemplos, respostas reais, exportação e CORS |
| O | `testes/operacao-http.test.ts`: saúde, timeout/readiness, correlação e ausência de dados privados nos logs |
| F | `testes/backup.test.ts`: recuperação da API após falha de captura e datas no horário de Brasília |
| R | `testes/robustez.test.ts`: erros estruturados, JWT obrigatório, headers, uploads, falhas de armazenamento, commit incerto e trava exclusiva |
| L | `testes/carga/cenario.ts`, `codigo/comandos/verificar-carga.ts`: carga k6, limites Docker, latências, recursos e integridade depois do ensaio |
| D | `codigo/comandos/verificar-devops.ts`: imagens Linux, migrations separadas, startup, usuário, volumes, interrupção do PostgreSQL, backup e restauração |

Os nomes dos cenários abaixo permitem localizar as asserções. `OK local` significa execução local aprovada ou inspeção identificada explicitamente; execução no GitHub tem status separado ao final.

## Requisitos funcionais

| Requisito | Rotas principais | Implementação em `codigo/modulos/` | Teste/evidência | Resultado |
| --- | --- | --- | --- | --- |
| RF-MVP-01 Cadastro | `POST /api/auth/register` | `autenticacao/auth.controller.ts`, `auth.service.ts`, `auth.repository.ts` | H: cadastro independente, normalização do e-mail, perfil NORMAL e rejeição de privilégio | OK local |
| RF-MVP-02 Login/logout | `POST /api/auth/login`, `/logout`; `GET /api/me` | `autenticacao/`; `compartilhado/context.ts` | H: credenciais incorretas, expiração, bloqueio, logout e invalidação; C: sessão pública sem hash | OK local |
| RF-MVP-03 Criar república | `POST /api/republicas` | `republicas/republicas.service.ts` | H: criação HTTP promove o criador; B: república e vínculo na mesma transação, administrador inválido recusado | OK local |
| RF-MVP-04 Entrar por código | `POST /api/republicas/entrar` | `republicas/` | H: entrada, vínculo único, troca inválida e rollback | OK local |
| RF-MVP-05 Moradores ativos | `GET /api/membros` | `republicas/republicas.repository.ts` | H: lista ativa exclui quem saiu; `inativos=true` é restrito à administração | OK local |
| RF-MVP-06 Cadastrar despesa | `POST /api/despesas` | `financeiro/` | H: despesa HTTP e rateio, NORMAL 403 e membro externo 400 sem inserção | OK local |
| RF-MVP-07 Rateio igual | `POST/PATCH /api/despesas` | `financeiro/dominio/rateio.ts`, service/repository | `rateio.test.ts`, B e A: centavos, soma exata, seleção vazia/duplicada/externa e rollback | OK local |
| RF-MVP-08 Pagamento/comprovante | `POST /api/pagamentos`; `GET /api/pagamentos/{id}/comprovante` | `financeiro/`; `infraestrutura/armazenamento/receipts.ts` | H: parcial, idempotência, concorrência, autorização, tipo real, limite de arquivo e arquivo ausente; D: hash após restauração | OK local |
| RF-MVP-09 Consultar financeiro | `GET /api/despesas`, `/{id}` e `/api/me/financeiro` | `financeiro/`; `compartilhado/http/validation.ts` | H: edição pré/pós-pagamento e estados PENDENTE/VENCIDA/PAGA; dívida antiga própria; C: respostas validam o contrato | OK local |
| RF-MVP-10 Tarefas | `POST/GET /api/tarefas`; `PATCH /api/tarefas/{id}` | `tarefas/` | H: atribuir/listar/concluir, responsável de outra casa recusado, outro morador 403 e outra casa 404; B: FK contextual | OK local |
| RF-MVP-11 Dashboard | `GET /api/dashboard` | `painel/dashboard.repository.ts` | H: parciais e ex-moradores; primeiro/último instante mensal, mês anterior/seguinte excluídos; seed e C validam próximos vencimentos e tarefas | OK local |
| RF-MVP-12 MASTER | `/api/master/usuarios`, `/republicas`, status, dashboard e recursos por república | `administracao/`, services com escopo explícito | H: todas as famílias MASTER recusam NORMAL/ADMIN sem mutações; MASTER acessa outra casa, bloqueia/desbloqueia e vê painel global | OK local |

## Regras de negócio

| Regra | Onde é garantida | Evidência | Resultado |
| --- | --- | --- | --- |
| RN-MVP-01 Isolamento entre repúblicas | `compartilhado/context.ts`, filtros nos repositories e escopo MASTER explícito | H: leitura/edição de despesa, tarefa e comprovante externo recusados, lista sem recursos da outra casa | OK local |
| RN-MVP-02 Administração contextual | `requireAdmin`, `requireMaster`, services de repúblicas e financeiro | H: morador não cria/edita despesas, rotas MASTER recusam todos os perfis inferiores | OK local |
| RN-MVP-03 Mesmo contexto para membros | Seleção ativa no service, FKs e triggers nas migrations | B: rateio/tarefa de outra casa recusado; H: HTTP não deixa registros inválidos | OK local |
| RN-MVP-04 Valor positivo | Zod, domínio de centavos e CHECK SQL | Unitários e B: zero, negativo, formato ambíguo e precisão inválida recusados | OK local |
| RN-MVP-05 Soma exata | Divisão inteira de centavos e constraint triggers diferidas | B: soma divergente e divisão desigual recusadas; A: falha reverte despesa e rateios | OK local |
| RN-MVP-06 Pagamento até o saldo | Service dentro de transação serializável e trigger acumuladora | H: dois pagamentos concorrentes não ultrapassam saldo; D: sobrepagamento rejeitado na API e no banco restaurado | OK local |
| RN-MVP-07 Quitação integral | Trigger sincroniza rateios e despesa | B e H: parcial não quita, soma exata produz PAGO/PAGA | OK local |
| RN-MVP-08 Histórico preservado | FKs restritivas, vínculos inativos e pagamentos imutáveis | B: exclusão de vínculo com histórico/alteração de pagamento recusadas; H: pagamento de dívida após troca | OK local |
| RN-MVP-09 MASTER independente e rotas exclusivas | Rotas `/api/master/*` com autenticação; `requireMaster` dentro da transação | H: MASTER sem casa acessa recursos globais; todas as famílias recusam NORMAL/ADMIN | OK local |
| RN-MVP-10 Sem autopromoção | Cadastro estrito sem `tipoUsuario`; provisionamento administrativo por comando | H: cadastro com privilégio retorna 400; inspeção dos campos editáveis | OK local |

## Requisitos não funcionais

| Requisito | Implementação/evidência | Resultado |
| --- | --- | --- |
| RNF-MVP-01 Hash, JWT e validação | Argon2id, HS256 com issuer/audience e validade de 1h, Zod e verificação contextual da versão; H testa expiração, senha, bloqueio e logout | OK local |
| RNF-MVP-02 Privacidade | Middleware autentica; autorização MASTER e contexto são revalidados nos services, na mesma transação das consultas; H testa todas as famílias restritas | OK local; autorização de perfil fica no service, conforme arquitetura adotada |
| RNF-MVP-03 Atomicidade | `infraestrutura/banco/transaction.ts` e migrations; A/B comprovam rollback e conflitos | OK local |
| RNF-MVP-04 Configuração | `.env*` ignorados, exemplos sem segredos reais; imagem recebe ambiente no runtime; O/D conferem logs; CI usa credenciais descartáveis próprias | OK local por inspeção e testes; exemplos/fixtures não são credenciais de produção |
| RNF-MVP-05 PostgreSQL/migrations | Prisma 7, PostgreSQL 18, sete migrations aplicadas do zero em H/D, sem modificar as anteriores | OK local |
| RNF-MVP-06 Camadas | Routes → controllers → services → repositories, domínio e infraestrutura separados; inspeção em `codigo/` | OK local por inspeção |
| RNF-MVP-07 Testes | `npm run verificar` exige banco dedicado e executa build/contrato/tipos/testes; CI declara a mesma verificação | OK local; remoto pendente |

## Ampliações e operação aprovadas

| Item | Rotas/arquivos | Evidência e resultado |
| --- | --- | --- |
| Pagamentos parciais/idempotência | `POST /api/pagamentos`, `Idempotency-Key` UUID | H: replay devolve mesmo pagamento, dados diferentes 409, concorrência sem duplicação; OK local |
| Sair/trocar/reentrar com histórico | `/api/republicas/sair`, `/trocar`, `/entrar`; `/api/me/financeiro` | H: vínculo antigo conservado, dívida acessível apenas pelo titular e troca inválida reverte; OK local |
| Transferir administração | `/api/republicas/transferir-admin` e variante MASTER | H: transferência explícita e externa recusada; B: concorrência com desativação; OK local |
| Exclusão lógica | `DELETE /api/me` | H: senha obrigatória, administração/dívida impedem, último MASTER preservado, pagamentos continuam, tokens inválidos e reativação proibida; OK local |
| Edição segura de despesas | `PATCH /api/despesas/{id}` | H: valores/participantes editáveis antes do primeiro pagamento; depois 409, metadados editáveis, valores antigos intactos; OK local |
| Contrato e CORS | `codigo/contratos/openapi.ts`, `documentacao/openapi.json` | C: exemplos/respostas/exportação; H: header de requisição em todas as respostas da jornada; OK local |
| Referência de horário nacional | `configuracao/time-zone.ts`, `APP_TIME_ZONE` | Horário de Brasília por padrão; H testa fronteiras mensais e F testa data civil; OK local |
| Docker compilado separado | `Dockerfile`, `docker-compose.backend.yml` | D: Node 24, UID 1000, sem bind mount, migrations antes da API, banco e comprovantes persistentes; OK local |
| Readiness/saúde | `GET /api/ready`, `/api/health` | O/D: 503 com banco indisponível em menos de 2s e health 200; retorna ao normal após recuperação; OK local |
| Logs privados e correlação | `compartilhado/http/request-log.ts` | O/D: UUID no header/log, método/caminho/status/duração, sem dados privados; OK local |
| Backup e restauração | `npm run backup`, `npm run restaurar` | F: API reiniciada após falha; D: hashes, histórico, tarefas, configurações ACID e comprovante recuperados em volumes novos; OK local |
| CI | `.github/workflows/backend.yml` | Push main, PR main e manual; Linux/Node24/PG18, verificação, OpenAPI e ensaio Docker; arquivo criado, execução remota pendente |

## Consolidação e crescimento

| Item aprovado | Evidência | Resultado |
| --- | --- | --- |
| Erros previsíveis sem SQL ou mensagem interna | R: códigos estruturados aninhados; H: conflitos financeiros; O/D: logs privados correlacionados | OK local |
| Sessão ativa antes do upload e autorização transacional | R: JWT incompleto recusado; H: sessão excluída recusa multipart acima do limite antes de processar o arquivo; contexto revalidado dentro da transação | OK local |
| Headers e limites HTTP | R: Helmet; O: respostas privadas; inspeção de `server.ts`: 10s headers/30s requisição | OK local; tempos de recebimento conferidos por configuração |
| Dois uploads por instância, falha de escrita e commit incerto | R: terceiro recebe 429/Retry-After, liberação dos slots, falhas EACCES/escrita e preservação após conexão incerta | OK local |
| Paginação das nove listagens | H: totais e autorização, filtros, página vazia, valores inválidos, ordenação e páginas sem sobreposição; C: contrato 2.0.0 sincronizado | OK local |
| Pagamento concorrente com edição e exclusão com nova dívida | H: respostas HTTP e saldos/histórico finais | OK local |
| Transferência com desativação e último MASTER | B: transferência concorrente; H: dois bloqueios concorrentes preservam um MASTER ativo | OK local |
| Drenagem e idempotência após reinício | D: requisição de pagamento aguardando trava SQL durante SIGTERM conclui; replay retorna mesmo ID e snapshot permanece igual | OK local |
| Backup concorrente e recuperação após falha real | D: segunda captura recusada pela trava; primeira falha depois de parar a API, que reinicia e mantém download e snapshot | OK local |
| Banco indisponível e retorno | D: PostgreSQL parado, ready 503 em menos de 2s, health 200 e recuperação automática | OK local |
| Meta de 1.000 contas/100 repúblicas/50 simultâneos | L: 10.000 despesas, 2.000 tarefas, cinco minutos com 50 VUs; p95 leitura 177,46ms/escrita 219,47ms; zero falhas inesperadas/500/violações | Meta aprovada no cenário local; [medição](evidencias/carga-consolidacao.json) |
| Inventário manual de comprovantes | `npm run comprovantes:verificar`: modo somente leitura; desenvolvimento sem referências/arquivos ausentes ou órfãos | OK local |

## Falha reproduzida e correção

`GET /api/pagamentos/{id}/comprovante` respondia **500** quando o registro existia, mas o arquivo havia desaparecido do armazenamento. O teste `arquivo físico ausente retorna 404 conforme o contrato, preservando o pagamento` reproduziu a divergência antes da correção (`500 !== 404`). O controller agora traduz ENOENT para `404 NOT_FOUND`, mantendo o pagamento. O teste restaura sua fixture de arquivo em `finally`; toda a regressão passou depois da correção. O contrato já previa 404 nesse caso e ganhou documentação de readiness e `X-Request-Id` nesta etapa.

Uma asserção inicial do ensaio Docker esperava extensão `pgcrypto`, mas as migrations usam `gen_random_uuid()` nativo do PostgreSQL. A asserção foi retirada; o ensaio compara as extensões realmente presentes antes/depois da restauração, sem criar extensão desnecessária.

## Resultado local e pendências

Os resultados atuais estão em [evidencias/validacao-consolidacao.json](evidencias/validacao-consolidacao.json) e [evidencias/carga-consolidacao.json](evidencias/carga-consolidacao.json). A verificação completa passou com **93 testes: 33 sem banco e 60 com PostgreSQL, zero falhas e zero ignorados**. A contagem inclui os testes-pai da jornada do runner Node. O registro anterior de 81 testes continua em [evidencias/validacao-local.json](evidencias/validacao-local.json), como histórico da etapa anterior.

Não foram identificadas falhas remanescentes de autorização, isolamento ou integridade financeira nos cenários acima. Isso não inclui frontend nem uma auditoria de segurança externa. O [roteiro de demonstração](ROTEIRO_DEMONSTRACAO_BACKEND.md) e o [guia operacional](OPERACAO_BACKEND.md) permitem repetir a validação.

| Ambiente/atividade | Estado |
| --- | --- |
| Backend, PostgreSQL e contrato locais | Aprovados na execução registrada |
| Build/startup/restart/indisponibilidade/backup/restauração Docker | Aprovados na execução registrada |
| Execução real do GitHub Actions | **Pendente por decisão do usuário**: commits somente locais; sem push ou PR e sem execução remota |
| Desenvolvimento | API recuperada na pasta atual, sete migrations e health/ready 200. Dumps preventivos preservados; PostgreSQL e volume original mantidos. Frontend antigo não foi recriado e permanece fora do escopo |
| Bloqueio de merge por status obrigatório | Configuração administrativa futura do GitHub; o job falha ao encontrar erro, mas branch protection não foi alterada |
| Frontend e deploy online | Fora do escopo desta etapa |
