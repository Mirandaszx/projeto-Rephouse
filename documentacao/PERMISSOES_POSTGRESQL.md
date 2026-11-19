# Contas técnicas do PostgreSQL — ambiente local

A API do Compose principal usa `rephouse_api`. A conta administrativa existente continua responsável por migrations e manutenção. Isso é independente dos perfis NORMAL, ADMIN e MASTER, que continuam sendo regras da aplicação.

## Permissões da API

A conta possui LOGIN, CONNECT, USAGE no schema e permissões explícitas nas 14 tabelas do domínio. Não é superusuária, não cria bancos ou roles, não possui BYPASSRLS, não pertence a outras roles e não é proprietária dos objetos. Não recebe CREATE no schema, TRUNCATE, acesso a `_prisma_migrations` nem exclusão de pagamentos/comprovantes.

As escritas autorizadas estão em [permissoes.ts](../codigo/infraestrutura/banco/permissoes.ts). DELETE é concedido somente a rateios (recriação permitida antes de pagamento) e desafios Google (limpeza limitada). A sequência de versões de configuração recebe USAGE. Não são concedidas permissões automáticas sobre futuras tabelas: novas migrations precisam revisar essa lista.

As constraints, triggers e transações continuam ativas. Esta etapa não cria RLS: a conta ainda acessa as linhas do domínio necessárias à API; o isolamento por usuário/república continua sendo validado pelo backend. Os privilégios herdados de PUBLIC, como TEMP no banco e execução de funções públicas, não foram removidos globalmente. A restrição de DDL se refere aos objetos persistentes protegidos, não à criação de tabelas temporárias.

## Separação de credenciais e arquivos

- `DATABASE_URL`, `API_DB_USER` e `API_DB_PASSWORD`: conexão limitada da API. Senha técnica aleatória de 32 bytes, armazenada localmente em `.env`.
- `MIGRATIONS_DATABASE_URL`: conexão administrativa local, preservada para provisionamento. Não é escolhida automaticamente pelo Prisma: os testes continuam usando sua URL exclusiva.
- `POSTGRES_USER` e `POSTGRES_PASSWORD`: credencial administrativa do cluster, usada pelo serviço manual `migracoes`.

O container `api` recebe somente a URL limitada e as configurações de execução. Não recebe as variáveis administrativas nem monta a raiz do repositório ou o `.env`. Código, manifesto e configuração TypeScript são montados como somente leitura. O volume de dependências é preservado.

`migracoes` pertence ao profile `manutencao`, tem acesso administrativo e não é uma dependência da API. Não execute código não confiável nesse serviço. Reiniciar ou recriar a API não instala dependências nem aplica migrations.

## Preparação de um banco novo

Com Docker Desktop iniciado, copie `.env.example` somente se não houver `.env`, configure as credenciais e o JWT. Não substitua credenciais de um volume existente. O fluxo abaixo aplica migrations **apenas em um banco novo ou quando todas as migrations pendentes estiverem aprovadas**:

```powershell
docker compose up -d --wait postgres
docker compose --profile manutencao run --rm migracoes
docker compose --profile manutencao run --rm migracoes npm run db:permissoes -- --compose
docker compose up -d --wait api frontend
```

O primeiro comando manual instala pelo lockfile, gera o Prisma e aplica migrations. O segundo provisiona permissões e atualiza o `.env`; não aplica migrations. `--compose` só é aceito no contexto explícito do serviço de manutenção. No host, após `npm ci`, o comando equivalente é `npm run db:permissoes`.

O provisionamento aceita somente `localhost`/`127.0.0.1:5432/rabbu_mvp`, schema `public`, e recusa produção. Usa transação e trava para alterar role/permissões. Recusa reutilizar conta administrativa, role com membros herdados ou proprietária de objetos. Pode ser repetido com a mesma configuração sem modificar dados. Se houver falha entre o provisionamento e a gravação do `.env`, corrija o arquivo/configuração e execute novamente antes de iniciar a API; não apague a role ou o volume.

## Banco local existente neste checkout

As nove migrations da auditoria de schema continuam pendentes no banco da equipe. **Não execute o comando padrão do serviço `migracoes` nesse banco enquanto sua aplicação não for autorizada.** A troca de conta não depende dessas migrations: foi testada nos schemas anterior e posterior a elas.

O override local `.devops-local/restricao-portas.override.json` continua preservando a configuração original do container PostgreSQL. Para recriar somente a API, depois do provisionamento:

```powershell
docker compose -p projeto-rephouse -f docker-compose.yml -f .devops-local/restricao-portas.override.json up -d --no-deps --pull never --wait api
```

Não é necessário recriar PostgreSQL, frontend ou volumes. `restart api` não atualiza variáveis de ambiente; após uma troca de credenciais, use a recriação somente da API indicada acima.

## Manutenção e recuperação

Para migrations futuras **aprovadas**, use explicitamente o serviço `migracoes`; após criar tabelas novas, revise a lista de privilégios e execute o provisionamento novamente. Pare a API antes de reinstalar dependências no volume compartilhado. Não altere `prisma.config.ts` para usar a URL administrativa como fallback, pois isso comprometeria o isolamento dos testes.

Em caso de erro de acesso, examine health/readiness e o código seguro do erro, confira o `.env` local e reprovisione as permissões necessárias. Não devolva superusuário à API para contornar o erro. As credenciais administrativas continuam disponíveis apenas na manutenção para recuperação. Não há alteração do proprietário, exclusão de dados ou remoção de volumes nesta operação.

Os Composes alternativos de backend compilado/homologação e os ensaios antigos não foram migrados para esse provisionamento nesta correção. Ainda usam sua configuração administrativa histórica; não constituem evidência desta separação e precisam da mesma revisão antes de voltar ao uso. Esta validação abrange o Compose principal local.

## Verificação

```powershell
# Depois de iniciar o PostgreSQL dedicado de testes e configurar TEST_DATABASE_URL:
$env:TEST_DATABASE_URL='postgresql://rephouse_interface_test:rephouse_interface_test_local@127.0.0.1:5544/rabbu_mvp_test?schema=public'
npm run test:permissoes
# Instala/prepara exclusivamente o PostgreSQL de testes e executa toda a regressão:
npm run test:completo
```

Os testes usam schemas e roles aleatórios somente no banco dedicado, fazem requisições HTTP reais e conferem os efeitos no PostgreSQL. Cobrem autenticação por senha e Google com assinatura controlada, edição de despesa, comprovante transacional/idempotência, recorrência gerada, tarefas, transferência, exclusão lógica e MASTER, além das negações de DDL e acesso a migrations. A limpeza remove somente recursos da própria execução.

A atribuição acima vale apenas para a sessão PowerShell de testes; não edite o `.env` da aplicação para esse fim. Uma `TEST_DATABASE_URL` antiga apontando para a porta 5432 ou para o usuário da equipe é recusada. `test:completo` prepara o destino dedicado sem depender dessa configuração antiga.

Resultados e contagens desta correção são registrados separadamente em `documentacao/evidencias/permissoes-postgresql.json`. As evidências anteriores da auditoria permanecem históricas; as falhas de idempotência em despesa/tarefa e de entrada monetária já registradas não são corrigidas nesta etapa.
