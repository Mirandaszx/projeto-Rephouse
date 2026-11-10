# Login e cadastro Google — RepHouse 2.1.0

O acesso por senha continua disponível. O Google cria contas NORMAL sem senha ou conecta uma identidade à conta local após confirmar a senha. A identidade permanente é o `sub`, nunca apenas o e-mail. Não há fusão de contas, recuperação de senha ou sessão persistente.

## Configurar o Google

1. No [Google Cloud Console](https://console.cloud.google.com/), crie ou selecione o projeto do grupo. Abra Google Auth Platform e configure o nome RepHouse, e-mail de suporte e contatos do responsável em Branding.
2. Em Audience, use público externo e, enquanto estiver em teste, inclua as contas Google da equipe em Test users. Não solicite acesso a dados além de nome, e-mail e perfil básico.
3. Em Clients, crie um cliente OAuth do tipo **Web application**. Cadastre as origens JavaScript `http://localhost` e `http://localhost:5173`. O fluxo usa botão com popup e callback; não usa URL de redirecionamento. Se decidir testar outro host/porta, cadastre essa origem também.
4. Copie o Client ID público (termina em `.apps.googleusercontent.com`) para `GOOGLE_CLIENT_ID` no `.env` da raiz. Não é necessário Client Secret neste fluxo. Não coloque segredos em variáveis `VITE_*`.
5. Confirme `CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`. Na homologação compilada, use `BACKEND_CORS_ORIGINS` equivalente e configure `GOOGLE_CLIENT_ID` no arquivo de ambiente selecionado. A criação e a confirmação dos desafios exigem Origin exata dessa lista.

A orientação segue a [configuração oficial](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) e a [validação de tokens](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token). O backend valida RS256, chaves Google com cache e timeout de dois segundos, emissor, audiência, validade, e-mail verificado e nonce. A opção interna de verificador injetável é usada somente pelos testes; não há variável de ambiente que desative a validação.

## Atualizar o ambiente local

Faça backup pelo procedimento operacional existente antes de atualizar um ambiente persistente. Esta entrega aplicou a migration apenas ao banco dedicado de testes, sem reset. As oito migrations anteriores não foram alteradas.

Em execução nativa, com `DATABASE_URL` apontando explicitamente para o ambiente escolhido:

```powershell
npm ci
npm run build
npm run db:deploy
npm start
```

No Compose de desenvolvimento, pare somente a API, aplique a migration e recrie somente esse serviço para receber o Client ID. O PostgreSQL e seus volumes permanecem no lugar:

```powershell
docker compose stop api
docker compose run --rm --no-deps api sh -c "npm ci && npm run db:generate && npm run db:deploy"
docker compose up -d --no-deps --force-recreate api
```

O frontend existente usa `/api` pelo proxy Vite. Abra **http://localhost:5173**, usando o mesmo host durante toda a jornada. `VITE_API_BASE_URL` deve ficar vazio: o cookie de desafio depende da mesma origem. Em execução nativa, configure `API_PROXY_TARGET` com a porta real do backend (3000 em desenvolvimento ou 3403 em homologação). Não reinicie ou recrie o banco para configurar o Google.

O Compose compilado recebe a mesma variável opcional. Em produção o cookie é Secure, portanto requer HTTPS na origem que servir a interface. O backend não hospeda o HTML: eventual CSP/COOP no servidor do frontend deve permitir o SDK, frames e popup oficiais. Hospedagem não faz parte desta entrega.

## Fluxo HTTP

| Operação | Entrada e resultado |
| --- | --- |
| `GET /api/auth/metodos` | `{google:{habilitado,clientId}}`; desabilitado devolve Client ID `null`. |
| `POST /api/auth/google/desafio` | `{finalidade:"login"}` ou `"exclusao"`; retorna `desafioId`, `nonce`, `expiraEm`. Exclusão exige Bearer ativo. |
| `POST /api/auth/google` | `{credential,desafioId,senha?}`; retorna `{token,usuario}`. |
| `DELETE /api/me` | Bearer com `{senha}` ou `{credential,desafioId}` de exclusão da própria conta. Sucesso `204`, sem corpo. A confirmação por Google está disponível na API; a tela de exclusão continua para outra etapa. |

O navegador recebe cookie `rephouse_google` com cinco minutos, HttpOnly, SameSite=Lax e Path=/api; Secure em produção. O nonce vai para o SDK oficial. Só hashes de nonce e cookie ficam no banco. O desafio de exclusão também fica vinculado ao usuário e à versão da sessão. Cada sucesso consome seu desafio na mesma transação da operação; falhas revertem o consumo. Desafios expirados são limpos em lotes de até 100 na criação de outro desafio.

Se o e-mail já existir, `409 GOOGLE_LINK_REQUIRED` pede a senha atual. Reenvie a mesma credencial e desafio com `senha`, dentro da validade. A interface guarda essa confirmação somente em memória e permite cancelar. A senha não é substituída e o perfil não é alterado. Outro `sub` já conectado à mesma conta retorna `409 GOOGLE_IDENTITY_CONFLICT`. Nenhum acesso reativa contas bloqueadas ou excluídas.

`401` indica credencial ou desafio inválido/expirado; `403` indica origem não autorizada ou confirmação de outra conta; `429` inclui Retry-After; `503` indica configuração ausente ou provedor indisponível. Erros usam `{error:{code,message}}` e `X-Request-Id`. Nunca registre o corpo, token Google, cookie ou senha ao solicitar suporte.

Login Google, login local e cadastro compartilham 20 tentativas/IP/15 min. Desafios têm limite independente de 60/IP/15 min. Não há repetição automática de login. Renovar o desafio após cinco minutos não repete a autenticação. O JWT RepHouse continua com uma hora, somente em memória; logout revoga as sessões existentes.

Pagamento, dívida, transferência de administração, último MASTER e histórico continuam com suas regras anteriores. A exclusão por Google passa pelo mesmo serviço de exclusão lógica. A constraint diferida impede que uma conta fique sem senha e sem identidade.

## Conferir com contas reais

Depois de configurar o Client ID, registre localmente data, versão e resultado, sem copiar credenciais:

1. Conta Google nova: entrar pelo botão, conferir `/api/me`, perfil NORMAL e ausência de vínculo; sair e entrar de novo, conferindo o mesmo ID.
2. Conta cadastrada por senha com o mesmo e-mail: cancelar a janela Google; tentar novamente; confirmar que pede senha; errar a senha e corrigir; conferir o mesmo usuário, perfil, tarefas e vínculo.
3. Cancelar a confirmação de vínculo e conferir que nenhuma vinculação foi criada. Bloquear uma conta fictícia e confirmar que Google não a reativa.
4. Confirmar logout/revogação, carregamento e erros; conferir que não há token no armazenamento do navegador. Para exclusão por Google, usar desafio de finalidade exclusao e manter todas as restrições existentes.

**Pendente nesta entrega:** configurar o Client ID e executar essas jornadas com contas Google reais. Os testes criptográficos usam tokens assinados com chaves locais controladas; os testes de interface substituem o SDK e a resposta Google. Essas evidências não são prova de login real no provedor.

## Testes locais

```powershell
docker compose -f interface/docker-compose.test.yml up -d
$env:TEST_DATABASE_URL='postgresql://rephouse_interface_test:rephouse_interface_test_local@127.0.0.1:5544/rabbu_mvp_test'
$env:DATABASE_URL=$env:TEST_DATABASE_URL
npm run db:deploy
npm run verificar
npm --prefix interface run verificar
```

Esses comandos usam somente o banco dedicado; não substitua a URL pelo banco da equipe. Testes Google criam schemas descartáveis, aplicam todas as migrations e verificam estado no PostgreSQL. As capturas de login/cadastro ficam em `.devops-local/interface/imagens/auth-*.png`. Resultados novos estão em `evidencias/validacao-login-google.json`; resultados anteriores foram preservados como histórico. Não houve commit, push, PR ou execução remota nesta etapa.

Em 05/11/2026, passaram **128 testes do backend e 20 da interface**, sem falhas ou ignorados. Compilação, lint, OpenAPI e tipos foram conferidos. A API de desenvolvimento também foi atualizada para 2.1.0, após backup preventivo de `rabbu_mvp`; as contagens de usuários, vínculos, tarefas, pagamentos e comprovantes permaneceram iguais (zero). O banco legado `banco_projeto` e os volumes não foram alterados. O Google continua desabilitado até configurar o Client ID.
