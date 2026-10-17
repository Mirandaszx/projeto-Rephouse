# Banco de dados do MVP RABBU

Implementação em PostgreSQL 18, baseada no documento `RABBU_MVP_Primeira_Entrega_3_Perfis.pdf`. O banco `rabbu_mvp` é separado do `banco_projeto` existente; as tabelas do banco anterior foram preservadas.

O [schema Prisma](../prisma/schema.prisma) define sete tabelas. As migrations também contêm regras SQL que o Prisma não representa, como triggers e a view de despesas vencidas. O backend usa TypeScript e ESM, com Prisma 7.10.0 e o gerador moderno `prisma-client`, que produz os tipos e o cliente em `codigo/gerado/prisma`. A conexão PostgreSQL usa `@prisma/adapter-pg`. [Geradores do Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators)

A organização dos módulos e a execução da API estão descritas em [ARQUITETURA.md](ARQUITETURA.md).

## Modelo

| Tabela | Finalidade |
| --- | --- |
| `usuarios` | Conta, hash da senha, perfil, versão de tokens e data de exclusão lógica. |
| `republicas` | República, endereço opcional, administrador e código de entrada único. |
| `membros_republica` | Vínculo entre usuário e república, sem duplicação. |
| `despesas` | Despesa, valor total, vencimento e autor. |
| `rateios_despesa` | Parcela de cada membro e situação de pagamento. |
| `pagamentos` | Pagamentos parciais ou integrais, com comprovante opcional e chave de idempotência. |
| `tarefas` | Tarefa da república e membro responsável. |

```mermaid
erDiagram
    usuarios ||--o{ republicas : administra
    usuarios ||--o{ membros_republica : participa
    usuarios ||--o{ despesas : cria
    republicas ||--o{ membros_republica : possui
    republicas ||--o{ despesas : possui
    republicas ||--o{ tarefas : possui
    membros_republica ||--o{ rateios_despesa : deve
    membros_republica ||--o{ pagamentos : paga
    membros_republica ||--o{ tarefas : executa
    despesas ||--|{ rateios_despesa : divide
    rateios_despesa ||--o{ pagamentos : recebe
```

Os perfis são `USUARIO_NORMAL`, `USUARIO_ADMIN` e `USUARIO_MASTER`. Novos usuários recebem `USUARIO_NORMAL` por padrão. Para provisionar uma conta ativa já cadastrada, execute `npm run master:provision -- --email EMAIL`. O comando invalida seus tokens anteriores; não há conta ou senha de demonstração.

Cada usuário pode ter somente um vínculo ativo. O administrador deve ter perfil ADMIN ou MASTER e vínculo ativo na própria república. Ao criar uma república, grave também esse vínculo na mesma transação. O autor de uma despesa deve ser o administrador da república ou um MASTER ativo.

Alterações administrativas são serializadas por transação para impedir que uma transferência de administração concorrente com a desativação do morador deixe a república sem responsável ativo. Desative moradores pelo campo `ativo`; as referências financeiras impedem a exclusão do histórico.

## Executar

1. Se ainda não existir `.env`, copie `.env.example` e ajuste as credenciais. `DATABASE_URL` deve apontar para `rabbu_mvp` no host `localhost` ao executar pelo Windows; no serviço da API do Compose, o host é `postgres`.
2. Garanta que `rabbu_mvp` exista. Um volume novo do Compose usa `POSTGRES_DB` na inicialização. Em um volume existente, alterar essa variável não cria nem renomeia o banco: crie `rabbu_mvp` usando uma conexão administrativa, se necessário.
3. Execute na raiz do projeto:

```powershell
npm ci
npm run auth:secret
npm run db:generate
npm run db:deploy
npm run db:status
npm run typecheck
npm test
```

`db:deploy` aplica as migrations versionadas. A migration ACID exige que essa conexão pertença ao dono do banco ou a um superusuário, pois define os padrões de isolamento e commit desse banco. Para desenvolver alterações futuras no schema, use `npm run db:migrate -- --name nome_da_alteracao` e depois `npm run db:generate`. Não use reset para instalar esta entrega.

No Compose, a API executa `npm ci`, `db:generate`, `db:deploy` e `dev`, nessa ordem. Esse ambiente de desenvolvimento instala também as dependências de desenvolvimento, que incluem a CLI Prisma.

O teste de integração exige uma URL explícita para um banco de teste separado, com as migrations já aplicadas:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://USUARIO:SENHA@localhost:5432/rabbu_mvp_test?schema=public'
$databaseUrlOriginal = $env:DATABASE_URL
try {
  $env:DATABASE_URL = $env:TEST_DATABASE_URL
  npm run db:deploy
} finally {
  $env:DATABASE_URL = $databaseUrlOriginal
}
npm run test:db
```

O banco de teste deve existir antes desses comandos. As fixtures financeiras antigas usam rollback; a jornada HTTP cria um schema temporário, aplica todas as migrations nele e o remove ao terminar. Os testes que confirmam dados no schema público usam exclusivamente `rabbu_mvp_test` e removem suas fixtures pelos próprios IDs. `TEST_DATABASE_URL` também pode ser definida no `.env`; sem ela, os testes de integração são ignorados explicitamente.

O `package.json` fixa versões corrigidas de duas dependências transitivas da CLI (`deepmerge-ts` e `mysql2`) por `overrides`; mantenha essas versões compatíveis ao atualizar o Prisma.

## ACID nas operações financeiras

PostgreSQL oferece transações ACID. As funções de [financeiro.service.ts](../codigo/modulos/financeiro/financeiro.service.ts) agrupam as gravações do MVP usando o helper [executarTransacaoAcid](../codigo/infraestrutura/banco/transaction.ts). O [repositório financeiro](../codigo/modulos/financeiro/financeiro.repository.ts) recebe o cliente da mesma transação para todas as consultas e gravações relacionadas.

| Propriedade | Aplicação no projeto |
| --- | --- |
| **A — Atomicidade** | Despesa e rateios são confirmados juntos; pagamento e atualizações dos status também. Uma falha desfaz todas as gravações daquela transação. [Transações no PostgreSQL](https://www.postgresql.org/docs/18/tutorial-transactions.html) |
| **C — Consistência** | Chaves estrangeiras, unicidade, checks e triggers validam vínculos, soma exata, divisão em centavos e limite do saldo. Verificações adiadas passam antes do commit. [Constraints](https://www.postgresql.org/docs/18/ddl-constraints.html) |
| **I — Isolamento** | A migration ACID configura `SERIALIZABLE` para novas conexões ao banco migrado; o Prisma e o helper também o definem explicitamente nas transações. Transações concorrentes confirmadas produzem um resultado compatível com uma execução em sequência. [Isolamento](https://www.postgresql.org/docs/18/transaction-iso.html) |
| **D — Durabilidade** | `fsync=on`, `full_page_writes=on` e `synchronous_commit=on` preservam a recuperação por WAL e aguardam sua gravação durável antes de confirmar. O diretório do PostgreSQL usa o volume persistente `postgres_data`. [Configuração de WAL](https://www.postgresql.org/docs/18/runtime-config-wal.html) |

O helper usa `prisma.$transaction`, fixa `SET LOCAL synchronous_commit=on` e tenta novamente a transação inteira apenas para conflitos transitórios (`P2034`, `40001` ou `40P01`), com limite padrão de **três tentativas**. Após o limite, devolve o erro. O PostgreSQL exige repetir também as leituras e decisões da transação; o Prisma documenta esse tratamento de conflitos. [Retry no PostgreSQL](https://www.postgresql.org/docs/18/mvcc-serialization-failure-handling.html), [transações no Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions)

A callback pode executar mais de uma vez. Mantenha nela somente operações do banco; uploads, e-mails e chamadas externas ficam fora da callback. `SET LOCAL` termina com a transação e não altera permanentemente a conexão do pool. [Escopo do SET LOCAL](https://www.postgresql.org/docs/18/sql-set.html)

Os padrões por banco passam a valer ao abrir **novas conexões** após a migration. [Padrões por banco no PostgreSQL](https://www.postgresql.org/docs/18/sql-alterdatabase.html) Os testes verificam rollback, integridade, concorrência, configurações e leitura por outra conexão. Essa validação de durabilidade não simula queda de energia ou falha de hardware. Volume persistente e WAL não substituem backups nem alta disponibilidade.

## Criar uma despesa com rateio

Valores monetários entram como strings, por exemplo `'100.00'`. A função [dividirIgualmente](../codigo/modulos/financeiro/dominio/rateio.ts) calcula em centavos e distribui o restante por ordem dos IDs dos membros. Para R$ 100,00 divididos entre três membros, as parcelas são R$ 33,34, R$ 33,33 e R$ 33,33.

Use `criarDespesaComRateio` para gravar despesa e parcelas na mesma transação, com o tratamento ACID descrito acima:

```typescript
import { createDatabase } from './codigo/infraestrutura/banco/client.js'
import { criarDespesaComRateio, registrarPagamento } from './codigo/modulos/financeiro/financeiro.service.js'
import type { CriarDespesaInput, RegistrarPagamentoInput } from './codigo/modulos/financeiro/financeiro.types.js'

const prisma = createDatabase()
type Referencias = Pick<CriarDespesaInput, 'republicaId' | 'criadaPorId' | 'membroIds'>

async function criarInternet(dados: Referencias) {
  return criarDespesaComRateio(prisma, {
    ...dados,
    titulo: 'Internet', categoria: 'Serviços',
    valorTotal: '100.00',
    vencimento: new Date('2026-10-31T00:00:00.000Z'),
  })
}

async function pagarParcela(dados: RegistrarPagamentoInput) {
  return registrarPagamento(prisma, dados)
}
```

Use IDs de membros ativos da república. A transação exige que a soma das parcelas corresponda exatamente ao total e que a diferença entre a maior e a menor parcela seja de, no máximo, R$ 0,01. Não grave uma despesa sem suas parcelas.

Um rateio recebe vários pagamentos. `valor_pago` corresponde à soma dos pagamentos; seu estado é `PENDENTE`, `PARCIAL` ou `PAGO`. Um novo pagamento deve ser positivo e não pode ultrapassar o saldo restante. Todos os pagamentos são imutáveis. A despesa vira `PAGA` somente quando todos os rateios estiverem quitados.

Na API, `POST /api/pagamentos` exige `rateioId`, `valor` e o header UUID `Idempotency-Key`. A mesma chave com o mesmo conteúdo retorna o pagamento anterior; conteúdos diferentes geram 409. O serviço interno aceita omitir `valor` para quitar o saldo restante; esse atalho não é exposto por HTTP.

`VENCIDA` é uma situação calculada, pois depende da data atual. A view `despesas_com_status` expõe `status_calculado` para exibir essa situação; o status persistido da despesa permanece `PENDENTE` ou `PAGA`. Exemplo de consulta parametrizada:

```typescript
const despesas = await prisma.$queryRaw`
  SELECT id, titulo, valor_total, vencimento, status_calculado
  FROM despesas_com_status
  WHERE republica_id = ${republicaId}::uuid
  ORDER BY vencimento
`
```

## Exclusão de conta e histórico

`DELETE /api/me`, autenticado e com confirmação da senha, desativa vínculos, registra `excluido_em` e incrementa `versao_token` na mesma transação. Dívidas abertas e administração pendente bloqueiam a exclusão. Um constraint trigger também impede gravar a exclusão em estado inconsistente.

Usuários, vínculos, rateios e pagamentos permanecem referenciados. Trata-se de exclusão lógica, sem anonimização ou remoção física; o e-mail continua reservado e a API MASTER não pode reativar a conta excluída. Sair da república é diferente: permite dívida e conserva a conta ativa para pagar o próprio histórico.

A autorização HTTP é implementada no backend. O banco complementa essa camada com integridade, sem interpretar JWT ou permissões de rotas. Veja [MIGRACAO_DJANGO.md](MIGRACAO_DJANGO.md).
