# Integração do frontend do PR #2

## Decisão

O frontend de João Lucas é a interface principal na pasta `interface`, por escolha do usuário em 09/11/2026. A API principal 2.1.0 permanece em `/api`, com o contrato paginado e as regras existentes. O adaptador `/api/front/v1` atende às respostas esperadas pelo frontend. Não há banco separado de produção, novas regras financeiras ou migrations nesta adaptação.

Abra **http://localhost:5173/** ou **http://localhost:5173/login**. Cadastro fica em `/cadastro`, república em `/republica` e MASTER em `/admin`. Endereços anteriores com `/novo` redirecionam para os definitivos. O layout anterior foi substituído, sem cópia de segurança, conforme solicitado. O [guia da interface](../interface/README.md) contém os comandos atuais de execução e testes.

Referência inspecionada: [PR #2](https://github.com/Mirandaszx/projeto-Rephouse/pull/2), branch `front`, commit `8e8ae9aeb84ad2404ee8afc474efa3c9b7986476`. A aprovação no GitHub não realizou merge. O PR estava destinado à `main`; a validação local não muda esse destino nem publica o código.

## Como a compatibilidade funciona

O proxy do frontend transforma `/api/...` em `/api/front/v1/...`. O backend reutiliza os mesmos routers, controllers, serviços, repositories e transações. Não faz requisições HTTP para si mesmo nem agrega páginas em transações diferentes.

| Parte do frontend | Endpoint no adaptador | Comportamento |
| --- | --- | --- |
| Cadastro, login e saída | `/auth/register`, `/auth/login`, `/auth/logout` | Sessão existente, perfis, bloqueio, exclusão lógica e revogação compartilhados. O limitador é o mesmo nos dois namespaces. |
| Conta e vínculo | `/me`, `/republicas`, `/republicas/atual`, `/republicas/entrar` | Mesmas contas e vínculos da API principal. Criar uma república atualiza o perfil administrativo. |
| Moradores | `/membros` | Array completo de membros autorizados. `inativos=true` continua restrito. |
| Resumo da casa | `/dashboard` | Totais e tarefas consultados no PostgreSQL, no horário de Brasília. |
| Despesas e pagamentos | `/despesas`, `/pagamentos` | Listagem em array; criação, rateio, saldo, pagamentos parciais e idempotência preservados. É registro manual, sem transferência Pix. |
| Comprovantes | `/pagamentos/{id}/comprovante` | Binário protegido, salvo no PostgreSQL. `comprovanteUrl` continua apontando para `/api/pagamentos/{id}/comprovante`. |
| Tarefas | `/tarefas`, `/tarefas/{id}` | Array completo, criação e conclusão reais, com autorização transacional. |
| MASTER | `/master/dashboard`, `/master/usuarios`, `/master/republicas` | Indicadores reais e diretórios em arrays. As demais operações MASTER existentes também estão disponíveis pelo adaptador. |

Os endpoints de perfil, saída/troca de república, transferência de administração, financeiro pessoal e escopos MASTER também são aliases das operações atuais. O OpenAPI e `integracao/api.d.ts` documentam os caminhos completos. Health, readiness e contrato continuam em `/api/health`, `/api/ready` e `/api/openapi.json`.

As listagens do adaptador retornam **a coleção completa até 1.000 registros**. Acima disso, retornam `409 FRONT_COLLECTION_LIMIT`, sem uma lista parcial. Esse limite protege a execução enquanto o protótipo trabalha com arrays. Para conjuntos maiores, a interface precisará consumir a paginação da API principal. Não aumentamos o limite de 100 itens por página da API 2.1.0.

O adaptador não aceita `pagina` e `limite`; parâmetros desconhecidos retornam `400`. O filtro `inativos` só é aceito nas listagens de moradores e mantém as permissões atuais. A autorização, o filtro, a consulta e a contagem continuam dentro da transação do serviço original.

## Comparar uma cópia externa do PR (opcional)

Para comparar com a referência original sem alterar a interface principal, use outra cópia da branch `front`, conferindo o commit acima. Instale as dependências dessa cópia pelo lockfile:

```powershell
npm --prefix 'C:\caminho\copia-do-pr\interface' ci
```

Na raiz deste backend, com a API atual em execução na porta 3000:

```powershell
$env:PR2_FRONTEND_PATH='C:\caminho\copia-do-pr\interface'
$env:PR2_API_URL='http://127.0.0.1:3000'
npm run front:pr2
```

Abra **http://127.0.0.1:5182/novo/login**. Essa porta é apenas a comparação opcional da cópia externa; a interface principal fica na 5173. Para encerrar a prévia, use `Ctrl+C` no terminal. O comando não faz seed, merge, commit ou push.

`PR2_API_URL` recebe somente a origem da API, sem `/api` ou credenciais. `PR2_FRONTEND_PORT` é opcional e tem padrão `5182`. O script usa o Vite e as dependências instaladas na cópia informada; nenhum arquivo do PR precisa ser editado.

O proxy mantém navegador e requisições na mesma origem. Se o frontend passar a acessar a API diretamente, configure CORS para a origem exata. Google continua dependendo do Client ID e da configuração de origem; o login do PR ainda não apresenta esse fluxo.

## Validar sem escrever no banco da equipe

O ensaio abaixo usa exclusivamente `rephouse-interface-test`, porta PostgreSQL `5544`, banco `rabbu_mvp_test` e schemas descartáveis. Não execute os testes contra `DATABASE_URL` da equipe.

```powershell
docker compose -f interface/docker-compose.test.yml up -d --wait postgres
$env:TEST_DATABASE_URL='postgresql://rephouse_interface_test:rephouse_interface_test_local@127.0.0.1:5544/rabbu_mvp_test'
npm run verificar

# A mesma cópia do PR definida na seção anterior:
npm --prefix interface run test:pr2

# Verificação da interface principal, agora com o design do PR:
npm --prefix interface run verificar
```

`test:pr2` inicia uma API de testes na porta 3405 e a cópia do frontend na 5182. Ambas as portas precisam estar livres. Não deixe uma prévia manual ocupando 5182 ao iniciar os testes. O encerramento reutiliza o mecanismo de limpeza do harness da interface existente.

Os testes do PR executam no navegador contra **HTTP e PostgreSQL reais**, sem interceptar as respostas da API. Cobrem 25 tarefas, conclusão, pagamento com arquivo, download, MASTER e rejeição de acesso por morador. A validação de unidade e HTTP cobre também coleções vazias, limite do adaptador, idempotência entre namespaces, CORS, revogação e compartilhamento do limitador.

## Limites das telas atuais

Algumas funcionalidades do backend ainda não têm controles nessas telas: edição de perfil, exclusão de conta, transferência de administração e certas ações de bloqueio. O adaptador disponibiliza as operações, mas não cria esses controles visuais.

O gráfico MASTER usa o campo ilustrativo opcional do protótipo. O backend não preenche esse campo com números fictícios; sem dados para o gráfico, a tela apresenta a mensagem de ausência de histórico. Um gráfico real exige definir um contrato próprio e ajustar a identificação na tela.

O frontend adotado guarda o JWT em `sessionStorage`, conforme o PR. Logout e revogação no banco permanecem efetivos. O tratamento de `requestId`, `Retry-After` e o acesso Google ainda precisam ser incorporados ao novo layout.

O trabalho permanece local. Merge, mudança do destino do PR, publicação de commits e execução remota de CI são etapas separadas.

## Resultado da adoção como interface principal

O comando `npm --prefix interface run verificar` passou com compilação, tipagem estrita, lint sem erros (cinco avisos de Fast Refresh já presentes no PR) e **quatro testes ativos aprovados**. As jornadas usam API e PostgreSQL reais. Home, login e cadastro foram conferidos em 320, 390, 768 e 1440 px, sem rolagem horizontal.

A tela efetivamente servida pelo Docker na porta 5173 também foi aberta no navegador: home, login e proxy responderam 200, sem erros JavaScript. Os 48 arquivos de `interface/codigo` foram comparados por SHA-256 com a referência do PR. Veja [design-pr2-principal.json](evidencias/design-pr2-principal.json).

## Resultado anterior à substituição, em 09/11/2026

| Jornada ou verificação | Resultado | Evidência |
| --- | --- | --- |
| Contrato principal, regras financeiras, histórico e Google controlado | Aprovado: 138 testes de backend, nenhum ignorado | `npm run verificar` |
| Compilação, tipos e lint da interface anterior | Aprovados | `npm --prefix interface run verificar` |
| Regressão da interface anterior | Aprovada: 20 testes | Mesmo comando acima |
| Login, 25 tarefas e conclusão pelo frontend do PR | Aprovado no navegador com API e PostgreSQL reais | `test:pr2` |
| Pagamento parcial com arquivo e download idêntico | Aprovado no navegador com estado persistido | `test:pr2` |
| MASTER, diretórios e rejeição por perfil | Aprovado no navegador com API real | `test:pr2` |
| Build do frontend do PR | Aprovado | `npm run build` na cópia isolada |
| Lint do frontend do PR | Zero erros; cinco avisos de Fast Refresh | `npm run lint` na cópia isolada |
| CI remota, novo ensaio de carga e Google real | Não executados nesta etapa | Não são cobertos pelas evidências locais |

Os detalhes históricos estão em [compatibilidade-front-pr2.json](evidencias/compatibilidade-front-pr2.json). Essa medição ocorreu quando as interfaces ainda estavam separadas e não representa a suíte ativa depois da substituição. Os testes de integração usam API e PostgreSQL reais, sem respostas interceptadas.
