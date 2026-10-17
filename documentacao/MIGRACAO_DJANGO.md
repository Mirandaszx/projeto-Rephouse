# Migração Django → Node.js/TypeScript

Referência analisada: [Sistema-da-Republica, commit 8a0cede](https://github.com/joaovictorflorencio/Sistema-da-Republica/tree/8a0cede2d7448e60fa04542556648c334a0230f6). A migração usa banco novo, sem importar SQLite, senhas, usuários ou arquivos antigos. A interface React será feita em outra etapa.

## Funcionalidades desta entrega

| Origem | Decisão implementada |
| --- | --- |
| Cadastro/login Django | Conta independente, e-mail normalizado, Argon2id, JWT de uma hora e logout com revogação global. |
| República e moradores | Entrada por código; apenas um vínculo ativo; reentrada reutiliza o vínculo histórico. |
| Saída e transferência | Saída com dívida permitida; administrador escolhe explicitamente seu sucessor. |
| Financeiro | Rateio igual entre selecionados; um selecionado assume a conta inteira. Pagamentos parciais e integrais com saldo protegido. |
| Comprovante obrigatório | Comprovante opcional, privado, validado pelo conteúdo e limitado a 5 MB. |
| Exclusão da conta | Incluída como exclusão lógica com confirmação da senha, quitação de dívidas e transferência prévia de administração. |
| Tarefas | Responsável obrigatório, prazo opcional, ABERTA/CONCLUIDA; morador apenas conclui as próprias tarefas. |
| Dashboard | Soma real de rateios e pagamentos, incluindo parciais e dívidas de ex-moradores; horário de Brasília por padrão (`APP_TIME_ZONE`). |
| Poder global is_staff | MASTER explícito, rotas próprias e provisionamento administrativo local. |
| Acertos entre pagador/recebedor, exclusão/edição de pagamento | Não portados. Pagamentos são uma trilha imutável; estornos ficam para outra entrega. |
| Prioridades, CEP, mapas e templates | Fora deste backend; endereço textual opcional foi incluído. |

## Preparar e executar

Copie `.env.example` para `.env` se necessário e configure PostgreSQL. Na raiz:

```powershell
npm ci
npm run auth:secret
npm run db:generate
npm run db:deploy
npm run typecheck
npm test
npm run dev
```

`auth:secret` grava uma chave aleatória no `.env` sem exibi-la ou substituir uma chave existente. O contrato OpenAPI 3.1 está em `GET /api/openapi.json`. Dinheiro usa strings decimais; IDs são UUIDs; vencimentos usam `YYYY-MM-DD`. Os nomes e endpoints são da nova API, sem aliases para o Django.

Para provisionar MASTER, cadastre primeiro uma conta comum e execute localmente:

```powershell
npm run master:provision -- --email seu-email@example.com
```

Faça login novamente depois do provisionamento. Não existe rota pública que aceite promover perfis.

## Endpoints principais

| Grupo | Rotas |
| --- | --- |
| Autenticação | `POST /api/auth/register`, `/login`, `/logout`; `GET/PATCH/DELETE /api/me`. |
| Repúblicas | `POST /api/republicas`; `GET/PATCH /api/republicas/atual`; `POST /api/republicas/entrar`, `/sair`, `/trocar`, `/transferir-admin`. |
| Membros | `GET /api/membros`; `?inativos=true` exige ADMIN; `PATCH /api/membros/:id` aceita somente `{"ativo":false}`. |
| Financeiro | `GET/POST /api/despesas`; `GET/PATCH /api/despesas/:id`; `POST /api/pagamentos`; `GET /api/pagamentos/:id/comprovante`. |
| Histórico próprio | `GET /api/me/financeiro` e `/api/me/financeiro/:id`, inclusive vínculos inativos. |
| Tarefas | `GET/POST /api/tarefas`; `PATCH /api/tarefas/:id`. |
| Dashboard | `GET /api/dashboard`. |
| MASTER | `GET /api/master/usuarios`, `/republicas`, `/dashboard`; `PATCH /api/master/usuarios/:id/status`, `/republicas/:id/status`. |

MASTER também administra contexto explícito em `/api/master/republicas/:republicaId`: dados da república, membros, transferência, despesas, tarefas e dashboard. Os mesmos serviços executam as regras; usuários comuns não fornecem `republicaId`, `usuarioId` ou `criadaPorId` nos corpos das operações normais.

## Pagamentos e arquivos

Envie JSON com `rateioId` e `valor`, mais `Idempotency-Key: UUID`. Com arquivo, use multipart com os mesmos campos e um arquivo no campo `comprovante`. O comprovante só pode ser baixado pelo proprietário, pelo administrador da república de origem ou por MASTER.

A chave identifica uma única solicitação, inclusive o conteúdo do arquivo. Reenviar dados idênticos retorna o mesmo pagamento; mudar valor, rateio, proprietário ou arquivo com a mesma chave retorna 409. Requisições concorrentes nunca podem ultrapassar o saldo. Não há edição ou exclusão de pagamentos.

Uploads ficam fora da callback transacional, que pode ser repetida. O arquivo é sincronizado em disco antes do registro. Falhas de negócio confirmadas removem o candidato; falhas de conexão com resultado de commit incerto preservam o arquivo para não destruir um comprovante já associado. Arquivos sem referência após tais falhas podem ser removidos em manutenção, somente depois de conferir o banco. PostgreSQL e filesystem não formam uma transação distribuída.

Na versão 2.0.1, os comprovantes ficam em tabela própria no PostgreSQL, junto ao pagamento na mesma transação. `UPLOAD_DIR` é usado somente pelo importador de arquivos legados; a API não depende de volume de arquivos. Consulte [COMPROVANTES_POSTGRESQL.md](COMPROVANTES_POSTGRESQL.md).

## Saída e exclusão da conta

Sair mantém a conta ativa e permite dívida. O usuário passa a consultar apenas os próprios rateios antigos, sem acesso aos dados atuais da casa anterior. Tarefas abertas ficam disponíveis ao administrador para reatribuição. A troca direta é atômica: um código inválido não encerra o vínculo anterior.

Excluir é definitivo na API: `DELETE /api/me` recebe `{"senha":"SUA_SENHA"}`. Exige conta autenticada, senha correta, nenhuma dívida atual ou antiga e nenhuma administração pendente. Todos os vínculos ativos são encerrados e tokens são invalidados na mesma transação. O último MASTER ativo também não pode ser excluído ou bloqueado.

A exclusão é lógica, sem anonimização: o registro e o e-mail continuam preservados para integridade do histórico. Conta excluída não entra novamente e não pode ser reativada por MASTER. Bloquear uma conta, por sua vez, é reversível, mas seus tokens anteriores continuam inválidos depois do desbloqueio.

## Validação e rastreabilidade

Os cenários antigos de autenticação, escopo por república e jornada do MVP foram adaptados em `testes/migration.test.ts`. Os testes de banco/ACID anteriores continuam cobrindo arredondamento, integridade, histórico, rollback e concorrência; agora incluem o estado PARCIAL. Os testes Django não são executados nem copiados como critério de equivalência para funcionalidades descartadas.

```powershell
npm test
npm run test:db
npm run typecheck
npm run build
```

`test:db` exige `TEST_DATABASE_URL` explícita. A jornada HTTP executa em schema temporário próprio do banco `rabbu_mvp_test`, aplica as migrations do zero e remove esse schema e os arquivos temporários ao terminar. Nunca executa limpeza de fixtures no banco principal.

Comentários relevantes no código registram o motivo das regras: seleção de membros, vínculos históricos, revogação, exclusão lógica, idempotência, ordem de locks e limites do retry.

A entrega para integração inclui schemas e exemplos de resposta, [contrato importável](openapi.json), CORS configurável, seed de demonstração e o comando `npm run verificar`. Veja [INTEGRACAO_BACKEND.md](INTEGRACAO_BACKEND.md) para preparar o ambiente e consumir a API.
