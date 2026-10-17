# Integração e validação do backend

Esta entrega prepara a API para quem desenvolve o frontend. O contrato OpenAPI inclui rotas, perfis, corpos de entrada, schemas e exemplos de resposta, erros, idempotência e download de arquivos. A interface permanece com seu responsável.

## Contrato 2.0.1

Todas as listagens retornam `{dados, paginacao}`. Acesse a coleção em `resposta.dados`, com parâmetros opcionais `pagina=1` e `limite=20` (máximo 100). `paginacao` informa `pagina`, `limite`, `totalItens` e `totalPaginas`. Páginas além do resultado retornam `dados: []`; parâmetros desconhecidos, duplicados ou inválidos retornam 400. `pagina` aceita até 1.000.000. O filtro `inativos` continua disponível para membros, conforme autorização. Consultas de detalhe e operações de escrita mantêm seus formatos. A mudança substitui os arrays diretos da versão anterior; importe novamente o OpenAPI no Insomnia.

## Executar a API

Na raiz, com PostgreSQL disponível e `.env` configurado:

```powershell
npm ci
npm run auth:secret
npm run db:generate
npm run db:deploy
npm run dev
```

Os dados de conexão ficam exclusivamente no `.env`. O banco configurado em `DATABASE_URL` precisa existir. As migrations anteriores são preservadas. A oitava migration acrescenta os comprovantes ao PostgreSQL; não há reset. Ambientes com arquivos legados devem seguir COMPROVANTES_POSTGRESQL.md antes de iniciar a API.

O endereço padrão é `http://localhost:3000`. `GET /api/health` verifica o processo HTTP. As rotas protegidas exigem:

```http
Authorization: Bearer TOKEN_RECEBIDO_NO_LOGIN
Content-Type: application/json
```

Cadastro e login retornam `{ "token": "...", "usuario": { ... } }`. O token dura uma hora; faça login novamente após expirar. Logout, bloqueio e exclusão revogam os tokens da conta. Depois de criar uma república, consulte `/api/me` para atualizar o perfil e o vínculo mostrados pela interface.

## Contrato para Insomnia e frontend

O arquivo [openapi.json](openapi.json) pode ser importado em ferramentas que suportam OpenAPI 3.1. Também é servido em `GET /api/openapi.json`. Ele não contém credenciais reais. Os exemplos têm dados ilustrativos e IDs compatíveis com a demonstração; tokens e senhas precisam ser preenchidos pelo desenvolvedor.

```powershell
npm run api:exportar
```

Esse comando atualiza o JSON a partir de `codigo/contratos/openapi.ts`. O teste de contrato verifica o schema oficial OpenAPI, as referências, os exemplos e a igualdade entre arquivo exportado e documento servido. A jornada HTTP também valida respostas reais contra esses schemas. Ao alterar a API, atualize o contrato, exporte novamente e rode a verificação.

Pontos do contrato que afetam a interface:

- Dinheiro entra e sai como string decimal: `"10.00"`. Use ponto no payload; a formatação em reais é de apresentação.
- Vencimento e prazo entram como `YYYY-MM-DD`. Na saída são strings ISO à meia-noite UTC. Para exibir a data civil, use os dez primeiros caracteres, sem conversão para o fuso local.
- `membroId`, `membroIds` e `responsavelId` identificam vínculos da república. Eles são diferentes de `usuarioId`; consulte `/api/membros`.
- As rotas comuns derivam a república do vínculo ativo. Somente MASTER fornece república explicitamente nas rotas `/api/master/republicas/{republicaId}`.
- Uma conta recém-cadastrada pode não ter república: `/api/me` retorna `membro: null`. Consultas que exigem vínculo retornam `409 NO_REPUBLIC`.
- Listagens retornam `{dados,paginacao}`; os registros ficam em `dados`. `204` não tem corpo e não deve ser interpretado como JSON.
- Erros seguem `{ "error": { "code": "...", "message": "..." } }`. Trate 401 como sessão indisponível; 403 como falta de permissão; 409 como conflito de regra ou de estado.
- `/api/me/financeiro` inclui os próprios rateios de vínculos antigos. Sair com dívida é permitido; excluir a conta com dívida retorna `409 OUTSTANDING_DEBT`.

## Pagamentos e comprovantes

Para cada novo pagamento, gere um UUID e envie no header `Idempotency-Key`. Se a resposta se perder, repita o mesmo corpo e o mesmo arquivo com a mesma chave. Uma repetição retorna o mesmo pagamento com status 201; mudar os dados usando a mesma chave retorna 409.

Sem arquivo, envie JSON com `rateioId` e `valor`. Com arquivo, envie multipart com esses dois campos e o campo de arquivo `comprovante`. Deixe o cliente HTTP montar o `Content-Type` e o boundary do multipart. São aceitos PDF, PNG, JPEG e WEBP de até 5 MiB, com tipo reconhecido pelo conteúdo.

`comprovanteUrl` é um caminho de download protegido, não uma URL pública. Faça o download enviando o Bearer token e trate a resposta como binário/Blob. O header `Content-Disposition` informa o nome do arquivo. Proprietário, administrador da república de origem e MASTER podem acessar.

## CORS para o navegador

No `.env`, configure as origens exatas que vão consumir a API:

```dotenv
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Reinicie a API após alterar o ambiente. Para homologação, substitua pelos endereços usados pela equipe, incluindo esquema e porta. Não são aceitos `*`, caminhos, consultas ou credenciais na origem. Uma lista vazia não libera leitura entre origens. O Compose oferece as duas origens locais como padrão de desenvolvimento; na execução direta, a variável ausente resulta em lista vazia.

O preflight aceita `Authorization`, `Content-Type` e `Idempotency-Key`. A resposta expõe `Content-Disposition`, `X-Request-Id`, `Retry-After` e headers de limite de tentativas. A autenticação usa Bearer, sem cookies de sessão.

CORS controla o acesso às respostas pelo navegador. Clientes como Insomnia e chamadas de servidor continuam dependendo da autenticação e das permissões da API. Requisições que passam pelo proxy `/api` do Vite usam a mesma origem do navegador e normalmente não precisam de CORS. [Documentação do middleware CORS](https://expressjs.com/en/resources/middleware/cors/).

## Dados de demonstração

Defina `DEMO_PASSWORD` no seu `.env` com uma senha local de 12 a 128 caracteres e execute:

```powershell
npm run db:seed
```

O comando usa o banco de `DATABASE_URL` e só permite `NODE_ENV=development` ou `test`. Cria tudo em uma transação. A senha é protegida com Argon2id e não aparece no terminal ou no contrato. O Prisma executa este seed somente quando solicitado explicitamente. [Seeding no Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/seeding).

| Conta | Perfil | Cenário inicial |
| --- | --- | --- |
| `master@demo.rephouse.test` | MASTER | Administração global, sem vínculo de moradia. |
| `admin.aurora@demo.rephouse.test` | ADMIN | Administra Aurora; parcela de internet quitada. |
| `admin.horizonte@demo.rephouse.test` | ADMIN | Administra Horizonte; parcela de água quitada. |
| `ana@demo.rephouse.test` | NORMAL | Mora em Aurora; pagou R$ 10 de R$ 30. |
| `bruno@demo.rephouse.test` | NORMAL | Mora em Horizonte; parcela quitada. |
| `carla@demo.rephouse.test` | NORMAL | Mora em Horizonte e deve R$ 30 da antiga Aurora. |

Todas usam a `DEMO_PASSWORD` da primeira execução. Os códigos são `DEMOAURORA` e `DEMOHORIZONTE`. Há seis usuários, duas repúblicas, seis vínculos (um inativo), duas despesas, cinco rateios, quatro pagamentos e três tarefas. Comprovantes podem ser enviados depois pela API. Vencimentos e prazos são definidos dez dias após a criação, usando o horário de Brasília (`America/Sao_Paulo`), padrão de `APP_TIME_ZONE`.

Repetir o comando preserva os dados, as senhas e as alterações feitas durante os testes. Mudar `DEMO_PASSWORD` não redefine contas existentes. Uma demonstração incompleta ou colisão com e-mails/códigos reservados interrompe a execução sem gravar alterações. O seed não possui limpeza ou reset; para recomeçar, use outro banco de desenvolvimento preparado com migrations.

Uma jornada manual útil é entrar como Ana, consultar `/api/me`, `/api/membros` e `/api/me/financeiro`, registrar um pagamento parcial e observar o saldo. Entre como Carla para consultar a dívida antiga, ou como MASTER para validar a visão global.

## Verificação automatizada completa

Prepare um banco separado `rabbu_mvp_test`, com migrations aplicadas, e configure `TEST_DATABASE_URL` no `.env`, conforme [BANCO_DE_DADOS.md](BANCO_DE_DADOS.md). Depois:

```powershell
npm run verificar
```

O comando compila o backend, exporta o contrato, verifica tipos e executa testes unitários, HTTP, de contrato, CORS, integridade, concorrência e seed. Para na primeira etapa que falhar. A ausência de uma URL para o banco dedicado é erro; não é tratada como uma aprovação com testes ignorados.

A API usada nos testes é temporária; não exige `npm run dev` nem usa a porta 3000. Os cenários persistentes e os dados de demonstração dos testes ficam no banco dedicado, com limpeza das próprias fixtures. Rodar a verificação não executa seed no banco principal.

Os comandos individuais `npm test`, `npm run test:db`, `npm run typecheck` e `npm run build` continuam disponíveis. Esta etapa verifica a integração local; implantação e operação de produção exigem preparação própria.

## Tipos e exemplos prontos

Consulte [integracao/README.md](../integracao/README.md). Os tipos são gerados do OpenAPI, sem Prisma, e os exemplos usam fetch. Execute `npm run api:tipos` para gerar e `npm run api:tipos:verificar` para conferir. Os comprovantes ficam no PostgreSQL, com as rotas e permissões preservadas; veja [operação e migração](COMPROVANTES_POSTGRESQL.md).
