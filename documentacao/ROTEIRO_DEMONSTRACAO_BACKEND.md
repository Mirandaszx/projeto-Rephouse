# Demonstração do backend

## Roteiro principal da terceira apresentação — 2.1.0

Inicie frontend, API e PostgreSQL pelo Compose principal, conforme o [guia operacional](OPERACAO_BACKEND.md#caminho-principal-docker-local). Use `http://localhost:5173` no navegador e `http://localhost:3000` como URL base no Insomnia, sem acrescentar `/api` à variável. Não é necessário preparar homologação separada, executar carga ou demonstrar backup, restauração e recuperação.

Cadastre contas fictícias pela interface ou por `POST /api/auth/register`, com nome, e-mail exclusivo e senha de 12 a 128 caracteres. Não execute seed, limpeza ou reset no banco compartilhado. Repita com novos e-mails se as contas já existirem; não modifique contas de colegas para reproduzir a apresentação.

| Etapa | Demonstração | Resultado esperado |
| --- | --- | --- |
| Acesso | Cadastro, login e `GET /api/me` | Cadastro 201, login e consulta 200; JWT necessário para operações protegidas |
| República | Criar uma república e consultar o perfil | Criador passa a ADMIN; república e vínculo persistidos |
| Moradores | Outra conta entra pelo código; consultar moradores | Entrada 201; somente moradores autorizados da república aparecem |
| Tarefa | ADMIN cria e atribui tarefa; responsável consulta e conclui | Criação 201; conclusão 200 e estado CONCLUIDA no banco |
| Permissões | Morador tenta criar tarefa ou concluir a de outro responsável | 403; a operação recusada não altera o estado |
| Isolamento | Conta de outra república tenta acessar uma tarefa da primeira | 404; dados da outra república não são expostos |
| Sessão | Logout e consulta com o token revogado | Logout 204 sem corpo; consulta posterior 401 |
| Banco e testes | Mostrar uma consulta SQL e um teste automatizado | Relações e estado coerentes com as operações; teste explica a regra protegida |

Para consultas MASTER, cadastre uma conta fictícia própria e provisione apenas essa conta pelo comando administrativo, nunca pelo cadastro público:

```powershell
docker compose exec api npm run master:provision -- --email master.apresentacao@example.test
```

Faça novo login: MASTER recebe 200 em `GET /api/master/usuarios`, enquanto NORMAL e ADMIN recebem 403. Dados anteriores à apresentação não devem ser alterados. O [roteiro detalhado de integração](JORNADAS_INTEGRACAO.md) e sua coleção Insomnia continuam disponíveis como referência opcional; no ambiente persistente, crie as contas pela API e ajuste `base_url` para a porta 3000. A sessão temporária descrita naquele guia é uma alternativa, não uma preparação obrigatória.

As listagens em `/api` retornam `{dados,paginacao}`; o frontend usa o adaptador `/api/front/v1`. `usuarioId` identifica a conta e `membroId` o vínculo usado na atribuição da tarefa. Consulte `/api/me` após mudanças de vínculo ou administração. Nas falhas, anote método, rota, resposta esperada/recebida e `X-Request-Id`, sem token ou senha.

## Roteiro financeiro anterior (opcional)

O conteúdo abaixo preserva a demonstração financeira das versões 2.0.0/2.0.1, ainda compatível com a API 2.1.0. Não é preparação obrigatória para a terceira apresentação e só deve usar dados fictícios próprios em banco exclusivamente demonstrativo. Comprovantes ficam no PostgreSQL; tipos e exemplos estão em `integracao/`.

Na versão 2.0.0, as respostas das listagens são paginadas: leia os registros em `dados` e os totais em `paginacao`. Use `?pagina=1&limite=20`; obtenha IDs de moradores em `dados`, mantendo as demais etapas abaixo.

Para este roteiro financeiro opcional, use um banco exclusivamente demonstrativo, separado dos dados da equipe. Importe `documentacao/openapi.json` no Insomnia e configure `baseUrl` para `http://localhost:3000` no Compose principal. Não há demonstração de recuperação neste roteiro.

## Preparar dados e variáveis

No desenvolvimento, com `DATABASE_URL` do ambiente escolhido e `DEMO_PASSWORD` de 12 a 128 caracteres no `.env`:

```powershell
npm run db:deploy
npm run db:seed
```

A seed não limpa nem sobrescreve registros e não redefine senhas. A primeira execução produz os valores abaixo; se alguém já alterou as fixtures, use outro projeto/banco de demonstração. Não apague dados para forçar a repetição.

| Conta | Perfil/contexto |
| --- | --- |
| `admin.aurora@demo.rephouse.test` | ADMIN da Aurora |
| `ana@demo.rephouse.test` | NORMAL ativa na Aurora, R$ 20 pendentes na conta inicial |
| `carla@demo.rephouse.test` | NORMAL na Horizonte, dívida histórica de R$ 30 na Aurora |
| `admin.horizonte@demo.rephouse.test` | ADMIN de outra república |
| `master@demo.rephouse.test` | MASTER sem república obrigatória |

Faça `POST /api/auth/login` para cada conta com a senha da primeira seed. Guarde os tokens em `tokenAdmin`, `tokenAna`, `tokenCarla`, `tokenOutraCasa` e `tokenMaster`. Nunca coloque tokens reais nos arquivos versionados.

```http
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{"email":"ana@demo.rephouse.test","senha":"SENHA_DA_PRIMEIRA_SEED"}
```

Resposta `200`: `{ "token": "...", "usuario": { "id": "...", "nome": "Ana Moradora", "email": "ana@demo.rephouse.test", "tipoUsuario": "USUARIO_NORMAL", "ativo": true, "criadoEm": "..." } }`. Toda resposta inclui `X-Request-Id`. Em chamadas protegidas, use `Authorization: Bearer {{token...}}`.

## Jornada principal e estado esperado

Os números pressupõem a primeira seed e pagamentos executados no mesmo mês do horário de Brasília. Guarde `membroAna` e `membroAdmin` de `GET /api/membros` e os IDs retornados pelas criações; IDs de membro e usuário são diferentes.

| Passo/requisição | Resultado HTTP | Efeito esperado no PostgreSQL |
| --- | --- | --- |
| `GET /api/health` e `GET /api/ready` | 200 `{"status":"ok"}` em ambos | Nenhuma gravação; ready faz `SELECT 1` |
| ADMIN: `GET /api/membros` | 200, somente os dois vínculos ativos da Aurora | Carla permanece inativa na Aurora; seus dados históricos continuam |
| ADMIN: `GET /api/dashboard` | 200: `totalPendente="50.00"`, `totalPagoNoMes="40.00"`, uma tarefa aberta | Soma real dos rateios e pagamentos da Aurora |
| NORMAL: `POST /api/despesas` com o corpo abaixo | 403 | Nenhuma despesa/rateio criado |
| ADMIN: mesma criação | 201; guarde `despesaDemo`, `rateioAna`, `rateioAdmin` | Uma despesa de 120 e dois rateios de 60; total pendente da Aurora passa a 170 |
| ADMIN da outra casa: `GET /api/despesas/{{despesaDemo}}` | 404 | Nenhuma leitura autorizada do recurso externo; sem mutação |
| Ana: pagamento de 20 no próprio rateio, multipart abaixo | 201; guarde `pagamentoDemo` e `comprovanteUrl` | Pagamento 20, rateio PARCIAL/pago 20/devido 60, despesa PENDENTE; comprovante privado persistido |
| Ana: repetir exatamente a requisição com a mesma chave e mesmo arquivo | 201 com o mesmo ID | Continua existindo somente um pagamento para a chave |
| Ana: reutilizar a chave com valor 21 | 409 | Nenhum pagamento adicional |
| ADMIN: `PATCH /api/despesas/{{despesaDemo}}` com `{"valorTotal":"121.00"}` | 409 | Total 120, dois rateios de 60 e pagamento 20 intactos |
| ADMIN: mesmo PATCH com `{"titulo":"Internet revisada"}` | 200 | Só título muda |
| Ana: `GET /api/dashboard` | 200: pendente 150, pago no mês 60 | Inclui a dívida histórica da Carla na Aurora |
| Dono, ADMIN de origem e MASTER: `GET {{comprovanteUrl}}` | 200 binário, `Content-Disposition` e `nosniff` | Arquivo inalterado; sem nova gravação financeira |
| Sem token / ADMIN da outra casa: mesmo download | 401 / 404 | Comprovante não revelado |
| Ana: novo pagamento de 40 com outra chave; ADMIN: pagamento de 60 no próprio rateio com outra chave | 201 em cada | Dois rateios PAGO de 60; despesa PAGA; Aurora pendente 50, pago no mês 160 |
| `GET /api/despesas/{{despesaDemo}}` | 200 com `status="PAGA"` e `statusCalculado="PAGA"` | Quitação sincronizada pelo banco |
| Ana: `PATCH /api/tarefas/de000000-0000-4000-8000-000700000001` com `{"status":"CONCLUIDA"}` | 200 | Tarefa atribuída à Ana concluída; tarefas abertas da Aurora passam a zero |
| Outro morador NORMAL da mesma casa (conta fictícia extra) tenta concluir essa tarefa | 403 | Responsável e estado mantidos |

Criação da despesa (substitua IDs com os obtidos no ambiente):

```http
POST {{baseUrl}}/api/despesas
Authorization: Bearer {{tokenAdmin}}
Content-Type: application/json

{"titulo":"Internet demonstração","categoria":"INTERNET","valorTotal":"120.00","vencimento":"2030-01-15","membroIds":["MEMBRO_ADMIN","MEMBRO_ANA"]}
```

Pagamento com arquivo no Insomnia: selecione **Multipart Form**, sem definir `Content-Type` manualmente. Campos `rateioId={{rateioAna}}`, `valor=20.00` e `comprovante` do tipo arquivo com um PDF real. Header `Idempotency-Key` deve ser um UUID novo, mantido somente para replays daquela mesma operação. Pode ser gerado por `node -e "console.log(crypto.randomUUID())"`.

Sem arquivo, o mesmo endpoint aceita JSON:

```http
POST {{baseUrl}}/api/pagamentos
Authorization: Bearer {{tokenAna}}
Idempotency-Key: UUID_NOVO
Content-Type: application/json

{"rateioId":"RATEIO_ANA","valor":"40.00"}
```

## Histórico, administração e exclusão

| Requisição | Resultado e conferência |
| --- | --- |
| Carla: `GET /api/republicas/atual` | 200, Horizonte |
| Carla: `GET /api/me/financeiro` | 200, inclui a própria dívida antiga de 30 da Aurora |
| Carla: `GET /api/despesas/de000000-0000-4000-8000-000400000001` | 404; ela não tem acesso geral à casa antiga |
| Ana: `DELETE /api/me` com senha, ainda com dívida inicial de 20 | 409 `OUTSTANDING_DEBT`; conta continua ativa |
| Ana: pagar 20 no rateio inicial `de000000-0000-4000-8000-000500000002`, com chave nova | 201; dívida própria encerrada, Aurora pendente 30 e pago no mês 180 |
| ADMIN: `POST /api/republicas/transferir-admin` com `{"membroId":"MEMBRO_ANA"}` | 200; Ana ADMIN, antigo ADMIN NORMAL, `republicas.admin_id` muda atomicamente |
| Antigo ADMIN tenta criar despesa | 403, mesmo usando o token antigo |
| Ana: `DELETE /api/me` com senha, agora administradora | 409 `TRANSFER_ADMIN_REQUIRED` |
| Ana: transferir de volta para `MEMBRO_ADMIN` | 200; papéis e responsável retornam aos valores anteriores |
| Ana: `DELETE /api/me` com `{"senha":"SENHA_DA_PRIMEIRA_SEED"}` | 204; `ativo=false`, `excluido_em` preenchido, vínculo inativo, versão de token incrementada |
| Ana: `GET /api/me` com token antigo / novo login | 401 / 401; pagamentos e rateios continuam no banco |
| MASTER: tentar reativar a conta excluída | 409 `ACCOUNT_DELETED` |
| NORMAL: `GET /api/master/usuarios`; MASTER: mesma consulta | 403 / 200; dados públicos, sem senha/hash/token |
| MASTER: `PATCH /api/master/republicas/de000000-0000-4000-8000-000200000002/status` com `{"ativa":false}` | 200; dashboard contextual do ADMIN Horizonte passa a 403 |
| MASTER: repetir status com `{"ativa":true}` | 200; acesso contextual volta a funcionar |
| Qualquer usuário ativo: `POST /api/auth/logout`; depois `GET /api/me` com o mesmo token | 204 / 401; logout invalida todas as sessões anteriores da conta |

Para demonstrar entrada e troca, cadastre uma conta fictícia nova, entre por `DEMOAURORA`, troque por `DEMOHORIZONTE` e consulte `GET /api/republicas/atual`. Uma troca com código inexistente retorna 404 e mantém o vínculo anterior. O administrador precisa transferir sua responsabilidade antes de sair.

## Consultas de conferência

Abra o psql **do projeto selecionado**, sem escrever sua senha no comando:

```powershell
docker compose exec postgres sh -c 'exec psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

```sql
SELECT d.id, d.titulo, d.valor_total, d.status,
       sum(r.valor_devido) AS rateado, sum(r.valor_pago) AS pago
FROM despesas d JOIN rateios_despesa r ON r.despesa_id=d.id
GROUP BY d.id ORDER BY d.criada_em;

SELECT r.id, r.status, r.valor_devido, r.valor_pago,
       (SELECT coalesce(sum(p.valor),0) FROM pagamentos p WHERE p.rateio_id=r.id) AS pagamentos
FROM rateios_despesa r;

SELECT id, nome, ativo, excluido_em FROM usuarios;
SELECT usuario_id, republica_id, ativo FROM membros_republica;
SHOW default_transaction_isolation;
SHOW synchronous_commit;
SHOW fsync;
SHOW full_page_writes;
```

Espere soma de rateios igual ao total, soma de pagamentos igual ao pago por rateio, nenhuma exclusão física do histórico e configurações `serializable`, `on`, `on`, `on`. Não consulte ou copie `senha_hash` para a apresentação.

## Repetição automatizada

Siga os comandos de [testes locais](../README.md#testes-locais-e-github-actions) no banco dedicado. `npm run verificar` cobre expiração de token, centavos, concorrência e as regras financeiras existentes, sem chamar carga ou recuperação. A suíte ativa do frontend é executada separadamente com `npm --prefix interface run verificar`. Resultados locais e remotos são registrados separadamente; o histórico das etapas anteriores está na [matriz de validação](VALIDACAO_MVP.md).
