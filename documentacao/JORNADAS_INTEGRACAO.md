# Integração de conta, repúblicas, moradores e tarefas

Entrega para quem consumirá o backend TypeScript. Usa o contrato **2.0.1**, sem mudar rotas ou respostas. Pagamentos, Pix, comprovantes, uploads e novos ensaios financeiros ficam para outra etapa. Os exemplos financeiros anteriores continuam disponíveis, separados desta jornada.

## Iniciar uma sessão isolada

Execute os comandos na raiz do repositório com Node.js 24 e PostgreSQL 18 disponíveis. Configure `TEST_DATABASE_URL` conforme o guia do banco: o nome obrigatório é `rabbu_mvp_test`, e o usuário precisa poder criar schemas. O comando não usa `DATABASE_URL`, não executa a seed financeira e não altera o schema `public`.

```powershell
npm ci
npm run db:generate
$env:DEMO_PASSWORD='Senha-ficticia-demonstracao-123!'
npm run integracao:demo
```

Mantenha o terminal aberto. A API fica em `http://127.0.0.1:3402`, acessível somente no computador local. O comando aplica as migrations em um schema novo e cria sete contas fictícias, inicialmente sem república. Só a conta MASTER começa com privilégio especial; criar uma república promove seu responsável a ADMIN pelas regras normais da API.

| Conta | E-mail | Uso |
| --- | --- | --- |
| Responsável Aurora | `admin.aurora@integracao.rephouse.test` | Cria Aurora e depois transfere a administração |
| Responsável Horizonte | `admin.horizonte@integracao.rephouse.test` | Cria Horizonte |
| Ana | `ana@integracao.rephouse.test` | Entrada, tarefas, troca, saída e reentrada |
| Bruno | `bruno@integracao.rephouse.test` | Outro morador da Aurora; futuro administrador |
| Carla | `carla@integracao.rephouse.test` | Moradora da Horizonte; teste de isolamento |
| Excluir | `excluir@integracao.rephouse.test` | Conta sem dívida para exclusão lógica |
| MASTER | `master@integracao.rephouse.test` | Administração global |

A mesma `DEMO_PASSWORD` vale somente para essas contas da sessão. O cadastro de `novo@integracao.rephouse.test` faz parte do roteiro. Fechar com **Ctrl+C** encerra a API e remove apenas o schema criado pela sessão. Uma nova execução começa com dados novos; tokens, códigos e IDs anteriores deixam de valer. Não há persistência de demonstração entre sessões. Após encerrar:

```powershell
Remove-Item Env:DEMO_PASSWORD
```

Se o processo for encerrado à força e não executar a limpeza, o schema com prefixo `integration_test_` pode permanecer no banco de testes. Seu nome aparece no terminal. A execução seguinte cria outro schema e não apaga o anterior automaticamente.

## Importar e preencher o Insomnia

Importe **`integracao/insomnia-jornadas.json`** por Import → File. O arquivo usa Insomnia JSON v4, ainda aceito para importação conforme a [documentação do Insomnia](https://developer.konghq.com/insomnia/import-export/). Também é possível importar o OpenAPI completo já existente; esta coleção contém apenas as jornadas selecionadas.

No ambiente local da coleção, preencha `senha` com a senha fictícia usada no terminal. `base_url` já aponta para a porta 3402. Os demais campos começam vazios. Não há credenciais reais ou scripts que capturem tokens no arquivo versionado. Preencha as variáveis manualmente a partir das respostas e execute as requisições na ordem do roteiro abaixo; não execute a coleção inteira em lote.

| Resposta | Variável |
| --- | --- |
| Login de cada conta: `token` | `tokenAdminAurora`, `tokenAdminHorizonte`, `tokenAna`, `tokenBruno`, `tokenCarla`, `tokenExcluir`, `tokenMaster` ou `tokenNovo` |
| Login/cadastro: `usuario.id` | `usuarioAnaId`, `usuarioBrunoId`, `usuarioExcluirId`, `usuarioNovoId` e demais equivalentes |
| Criação da república: `id`, `codigoEntrada` | `republicaAuroraId`, `codigoAurora`; ou equivalentes da Horizonte |
| Entrada: `id` | `membroAnaId`, `membroBrunoId`, `membroCarlaId`, `membroExcluirId` |
| `GET /api/me`: `membro.id` | Vínculo atual; para administradores, `membroAdminAuroraId` ou `membroAdminHorizonteId` |
| Criação da tarefa: `id` | `tarefaId` |

`usuarioId` identifica a conta; `membroId` identifica o vínculo com uma república. Para atribuir tarefas e transferir administração, envie **o ID do vínculo**, nunca o ID da conta. Ana terá vínculos diferentes nas duas repúblicas. Guarde o `membroAnaId` original da Aurora para conferir sua reutilização na reentrada.

## Roteiro e estado esperado

Os nomes abaixo correspondem às requisições da coleção; algumas são reutilizadas após mudanças de estado. As duas repúblicas começam a existir somente quando criadas pelos respectivos responsáveis. Todas as contas desta jornada estão sem dívida, e nenhuma operação financeira é necessária.

| Etapa | Requisições/ações | Resposta e estado esperado |
| --- | --- | --- |
| 1. Conta independente | Cadastrar conta sem república; Login da conta nova; Consultar conta nova; Editar nome; consultar novamente; Consultar contexto ausente | `201`, depois `200`; nome passa a `Novo Nome`; `membro=null`. Contexto ausente retorna `409 NO_REPUBLIC`; conta persiste sem vínculo. |
| 2. Duas repúblicas | Login admin.aurora; Criar Aurora; Atualizar perfil admin.aurora; Editar república Aurora. Repetir login/criação/perfil para Horizonte | Criação `201`; perfil `USUARIO_ADMIN`; um vínculo ativo por criador. Editar Aurora retorna `200`, com `endereco=null`. Guarde códigos e IDs. |
| 3. Moradores | Login e entrada de Ana, Bruno e Excluir na Aurora; Carla na Horizonte; Listar moradores ativos; NORMAL tenta listar inativos | Entradas `201`; quatro ativos na Aurora. Listagem `200` paginada; consulta de inativos por NORMAL retorna `403`. |
| 4. Tarefa | ADMIN atribui tarefa à Ana; Ana lista tarefas; Bruno tenta concluir tarefa da Ana; Carla tenta concluir tarefa da Aurora; ADMIN tenta atribuir tarefa à outra casa; NORMAL tenta criar tarefa | Criação `201`, tarefa `ABERTA`, prazo `2030-01-15`. Negativas: `403`, `404`, `400 INVALID_RESPONSIBLE`, `403`. Nenhuma delas altera a tarefa nem cria outra. |
| 5. Conclusão | Ana conclui a própria tarefa; Ana tenta editar título | `200 CONCLUIDA`; alteração de título `403`, título preservado. NORMAL pode apenas enviar `status=CONCLUIDA` em tarefa própria. |
| 6. Vínculos | Trocar com código inválido; Atualizar contexto da Ana; Ana troca para Horizonte; atualizar contexto; ADMIN lista vínculos ativos e inativos | Código inválido `404`, vínculo Aurora continua ativo. Troca válida `200`: Aurora inativa, Horizonte ativa. `inativos=true` inclui vínculos de ambos os estados e exige ADMIN ou MASTER. |
| 7. Saída e reentrada | Ana sai da Horizonte; atualizar contexto; repetir Entrar ana na Aurora | Saída `204` sem corpo; `/api/me` retorna `membro=null`. Reentrada `201` reutiliza o vínculo original da Aurora. |
| 8. Administração | Transferir Aurora para Bruno; Atualizar perfil admin.aurora; Atualizar perfil de Bruno; Antigo ADMIN tenta criar tarefa | `200`; antigo responsável passa a NORMAL, Bruno a ADMIN e `admin_id` muda. Token antigo perde poderes imediatamente: criação retorna `403`. Consulte `/api/me` sem exigir novo login. |
| 9. Paginação | Paginação inválida; Página além dos resultados, com tokenBruno | `400` para limite 101. Página 999 retorna `200`, `dados=[]`, totais corretos. |
| 10. MASTER | Login master; MASTER lista usuários; MASTER lista repúblicas; NORMAL tenta acessar MASTER; repetir a negativa com tokenBruno | Listagens `200` paginadas; NORMAL e ADMIN recebem `403`. Usuários listados não contêm hashes, senhas ou tokens. |
| 11. Bloqueio de república | MASTER bloqueia Horizonte; Carla consulta república bloqueada; MASTER desbloqueia Horizonte; Carla consulta contexto recuperado | Bloqueio `200`; tarefas retornam `403 REPUBLIC_BLOCKED`. Desbloqueio `200`; consulta volta a `200`, sem alterar os vínculos. |
| 12. Bloqueio de conta | MASTER bloqueia Ana; Ana usa token revogado; MASTER desbloqueia Ana; repetir token revogado; Login ana | Bloqueio/desbloqueio `200`. Token antigo continua `401` em ambos os estados. Novo login retorna `200`; atualize tokenAna. |
| 13. Logout | Logout de Ana; Ana usa token revogado | `204`, corpo vazio; consulta posterior `401`. O logout revoga todos os tokens anteriores da conta. |
| 14. Exclusão | Excluir conta fictícia sem dívida; Token de conta excluída; Login da conta excluída; MASTER tenta reativar excluída | Exclusão `204`; conta mantida com `ativo=false`, `excluido_em` preenchido e vínculo inativo. Token/login retornam `401`; reativação retorna `409 ACCOUNT_DELETED`. |

Depois de entrar, trocar, sair ou transferir administração, atualize o estado mostrado no frontend com **`GET /api/me`**. Não use o perfil salvo no primeiro login como fonte permanente de permissão. O backend revalida conta, sessão e autorização dentro da transação de cada operação.

Para conferência manual pelo PostgreSQL, conecte-se **ao banco de testes** e selecione o schema exibido pelo comando com `SET search_path TO integration_test_NOME_DA_SESSAO;`. Consulte apenas dados públicos:

```sql
SELECT id, nome, tipo_usuario, ativo, excluido_em FROM usuarios;
SELECT id, nome, admin_id, ativa FROM republicas;
SELECT id, usuario_id, republica_id, ativo FROM membros_republica;
SELECT id, republica_id, responsavel_id, titulo, status, prazo FROM tarefas;
```

Na execução manual completa, espere oito contas, duas repúblicas, sete vínculos (dois inativos) e uma tarefa concluída. O teste automatizado cria uma segunda tarefa para exercitar os exemplos tipados; por isso sua contagem difere. Não há despesas ou pagamentos criados nesta jornada.

## Consumir os exemplos TypeScript

Copie `integracao/api.d.ts`, `integracao/exemplos.ts` e `integracao/jornadas.ts` para o projeto consumidor. Os imports `.js` são compatíveis com a compilação TypeScript; não são imports de módulos internos do backend. Os exemplos usam apenas `fetch` e os tipos do contrato.

```typescript
import {login,ErroResposta} from './exemplos.js'
import {consultarMinhaConta,listarMoradores,criarTarefa,listarTarefas,concluirTarefa} from './jornadas.js'

const sessao=await login(baseUrl,{email,senha})
const conta=await consultarMinhaConta(baseUrl,sessao.token)
if(conta.membro){
  const moradores=await listarMoradores(baseUrl,sessao.token,1,20)
  const vinculo=moradores.dados.find(membro=>membro.usuarioId===conta.id)
  // O exemplo seguinte exige ADMIN ou MASTER autorizado no contexto.
  if(vinculo&&conta.tipoUsuario!=='USUARIO_NORMAL'){
    const tarefa=await criarTarefa(baseUrl,sessao.token,{titulo:'Limpar cozinha',responsavelId:vinculo.id,prazo:'2030-01-15'})
    await concluirTarefa(baseUrl,sessao.token,tarefa.id)
  }
  const tarefas=await listarTarefas(baseUrl,sessao.token)
  console.log(tarefas.paginacao.totalItens) // Não registre o token ou os dados privados.
}
```

Trate falhas com `error instanceof ErroResposta`; a classe fornece `status`, `code`, `requestId` e `retryAfter`. Erros de rede do próprio fetch não possuem necessariamente uma resposta HTTP nem requestId. Os exemplos não capturam ou repetem automaticamente a requisição e não validam JSON em runtime: a validação continua no servidor.

| HTTP | Conduta do consumidor |
| --- | --- |
| `400` | Corrigir campos, IDs e paginação; não repetir o mesmo payload inválido. |
| `401` | Solicitar novo login e atualizar o estado da sessão. Não existe refresh token. |
| `403` | Informar falta de permissão ou contexto bloqueado, conforme `code`. |
| `404` | Tratar como recurso indisponível; pode representar isolamento entre repúblicas. |
| `409` | Apresentar a regra indicada por `code`, como `NO_REPUBLIC` ou `TRANSFER_ADMIN_REQUIRED`. Atualizar o contexto antes de nova ação. |
| `429` | Respeitar `Retry-After`, quando presente, e oferecer nova tentativa explícita. Cadastro e login compartilham 20 tentativas por IP em 15 minutos. |
| `503` | Informar indisponibilidade temporária; respeitar `Retry-After` quando presente. Não repetir escritas automaticamente. `/api/ready` tem resposta própria `{status:"unavailable"}`. |
| `204` | Encerrar sem chamar `response.json()`. |

As listagens usam `{dados,paginacao}`, página 1 e limite 20 por padrão; máximo 100. Preserve os filtros ao mudar de página. Entradas de data civil usam `YYYY-MM-DD`; saídas correspondentes são ISO à meia-noite UTC: use os primeiros dez caracteres para apresentação da data, sem conversão de fuso. O horário geral da aplicação continua Brasília (`America/Sao_Paulo`).

No navegador, use uma das origens CORS da demonstração: `http://localhost:5173` ou `http://127.0.0.1:5173`. Fora dela, configure as origens exatas no ambiente escolhido. A URL base dos exemplos não inclui `/api`. Envie Bearer no header; não use cookies. O backend expõe `X-Request-Id`, `Retry-After`, `RateLimit` e `RateLimit-Policy`, entre os headers existentes. CORS controla a leitura pelo navegador; não concede autorização.

## Verificação e limites da evidência

```powershell
npm run test:integracao
npm run verificar
npm run api:tipos:verificar
```

O primeiro comando cria sua própria API temporária e schema, sem precisar iniciar a demonstração. Executa as **56 requisições da coleção**, exercita os exemplos tipados, valida os schemas das respostas e confere persistência. Abrange sessão expirada por JWT de fixture, CORS, limite real de autenticação e falha controlada da dependência de readiness. Essa falha controlada não significa que o PostgreSQL foi desligado neste ensaio.

A verificação completa inclui esta jornada e toda a regressão anterior, inclusive os testes financeiros existentes. Não executa nova carga financeira. Consulte os resultados em [EVIDENCIAS_INTEGRACAO.md](EVIDENCIAS_INTEGRACAO.md). Compilação para navegador e testes HTTP não equivalem a execução de telas nem à importação manual no aplicativo Insomnia; essas conferências são registradas separadamente.
