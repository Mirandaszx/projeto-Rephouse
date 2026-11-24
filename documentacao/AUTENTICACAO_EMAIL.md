# Autenticação por e-mail — RepHouse 3.0.0

Resultado local de 20/11/2026: **301 testes do backend aprovados**. Frontend completo: 82/83, com uma falha anterior de animação preservada; complemento final de autenticação/cadastro/rotas: 13/13. Compilação/tipagem/lint aprovados, com seis avisos anteriores de Fast Refresh. A [evidência da implementação](evidencias/autenticacao-email-2026-11-20.json) registra o estado anterior à ativação e permanece preservada.

**Ativação posterior, autorizada em 20/11/2026:** banco principal local `rabbu_mvp` com 21 migrations aplicadas, sem pendências, e API servindo **3.0.0**. Backup formato 2 com hash e catálogo conferidos; contagens e hashes das 15 tabelas anteriores preservados. Permissões limitadas atualizadas, volumes mantidos, health/readiness, proxy de autenticação, CORS e `X-Request-Id` conferidos. Configuração Resend carregada no backend. Não foram enviados e-mails nem criadas contas de teste no principal; entrega real e confirmação pelo provedor continuam pendentes. [Evidência da ativação](evidencias/ativacao-email-principal-2026-11-20.json).

Confirmação obrigatória do cadastro e login por link mágico. As contas existentes conservam senha, perfil, vínculos e histórico. A migration não marca nenhum endereço antigo como verificado.

## Contrato e experiência

O cadastro conserva Nome/E-mail/Senha e a intenção de criar ou entrar em uma república. `POST /api/auth/register` responde **202**, com `{confirmacaoPendente:true,message}`, sem usuário nem JWT. A solicitação pendente guarda nome, endereço e hash Argon2id da senha; ela não é uma conta e não acessa rotas privadas. A confirmação cria o usuário NORMAL, registra a verificação e consome o link na mesma transação.

Isso substitui o 201 com sessão imediata da versão 2.x. Aplicação e contrato passam para **3.0.0**. Consumidores anteriores precisam tratar o 202 e aguardar a confirmação. Os demais contratos, incluindo pagamentos e paginação, permanecem preservados.

`POST /api/auth/email/solicitar` recebe `{email,finalidade?}`, com `login` por padrão ou `cadastro` para reenvio. Login por link atende somente contas existentes, ativas e não excluídas. Não cadastra nem mescla contas automaticamente. Resposta genérica 202 não prova a existência da conta ou a entrega. E-mail já utilizado no cadastro continua retornando 409.

O link abre `/confirmar-email#id=...&token=...`. O fragmento é lido em memória e removido do endereço. Abrir a página não consome o link. O botão **Confirmar e entrar** envia `POST /api/auth/email/confirmar`, que retorna a sessão normal, válida por uma hora, e `acaoRepublica` (`criar`, `entrar` ou `null`). A interface usa essa intenção no redirecionamento, sem conceder privilégios.

## Proteções e limites

- Segredo aleatório de 32 bytes, dez minutos de validade, uso único e consumo Serializable. PostgreSQL guarda SHA-256 do token e da prova do navegador, nunca o link completo.
- Cookie `rephouse_email`: HttpOnly, SameSite=Lax, Path=/api, Secure em produção. O cookie dura um dia para permitir reenvio; cada link continua válido por dez minutos.
- Confirmação no **mesmo navegador, perfil e origem** da solicitação. Outro dispositivo, aba anônima ou navegador interno do aplicativo de e-mail não compartilha o cookie. Abrir no navegador original ou solicitar outro por ele. `localhost` e `127.0.0.1` são origens diferentes.
- `Origin` deve estar na lista permitida. `APP_PUBLIC_URL` vem da configuração, nunca de Host, Referer ou redirecionamento fornecido pelo cliente. Produção exige HTTPS.
- Cadastro pendente não pode ser sobrescrito por outra solicitação. Reenvio exige o cookie original; após 24 horas, iniciar novo cadastro. Isso protege contra cadastro prévio da senha de outra pessoa e troca involuntária de sessão.
- Novo link invalida os anteriores da mesma finalidade. Confirmar revalida conta ativa, exclusão e versão de revogação: logout invalida links de login anteriores.
- Limite HTTP compartilhado de 20 solicitações por IP em 15 minutos, por instância, para cadastro, senha, Google, solicitação e confirmação por e-mail; retorna 429 e Retry-After. No PostgreSQL: até três envios por endereço em 15 minutos, com intervalo de 60 segundos, inclusive entre instâncias. Solicitações desconhecidas usam o mesmo mecanismo e resposta genérica.
- Respostas não contêm hash, cookie ou segredo do link. JWT só aparece na confirmação/login bem-sucedidos. Logs omitem corpo, e-mail, query e credenciais.
- Conta limitada da API: SELECT/INSERT/UPDATE em links e limitadores; SELECT/INSERT em verificações, sem DELETE. A API não recebe credenciais administrativas.

Recarregar a confirmação depois de remover o fragmento perde o segredo em memória: solicitar outro link. Não persistir esse segredo em localStorage/sessionStorage. A sessão JWT continua em sessionStorage, conforme o comportamento existente; não houve migração da sessão para cookies.

## Configurar o Resend

O OAuth do MCP conecta as ferramentas do Codex, mas **não fornece credenciais à aplicação**. Criar uma chave própria em Resend → API Keys → Sending access. Revogar qualquer chave publicada em chat, código ou captura e gerar uma substituta.

No `.env` local do backend, sem substituir as variáveis existentes:

```dotenv
RESEND_API_KEY=re_SUBSTITUA_LOCALMENTE
EMAIL_FROM=onboarding@resend.dev
APP_PUBLIC_URL=http://localhost:5173
```

Configurar as três em conjunto e incluir a origem em `CORS_ORIGINS`. Não usar prefixo `VITE_`, enviar a chave no chat ou versionar o `.env`.

Com `onboarding@resend.dev`, Resend permite apenas o destinatário associado à própria conta. Para outros usuários, verificar um domínio de vocês, configurar o DNS indicado pelo serviço e usar remetente desse domínio. Desabilitar rastreamento de cliques/aberturas para mensagens de autenticação. Aceitação pelo provedor não comprova entrega na caixa de entrada.

O adaptador usa a API HTTPS do Resend com `fetch` nativo do Node.js 24, timeout de oito segundos e Idempotency-Key do ID da mensagem. Não instala dependências extras nem reaproveita credenciais do MCP. Não repete chamadas automaticamente. Falhas retornam 503 EMAIL_UNAVAILABLE, sem detalhes do provedor. A solicitação fica pendente e o cookie é preservado inclusive após falha do envio, permitindo reenvio manual depois do intervalo. Se o provedor aceitar e a resposta se perder, o uso único continua protegendo a confirmação.

Sem configuração: login por senha das contas existentes funciona, link fica oculto e novos cadastros ficam indisponíveis (503 EMAIL_DISABLED); não há cadastro alternativo que contorne a confirmação. Google conserva suas regras próprias de identidade e vinculação.

Referências oficiais: [API Resend](https://resend.com/docs/api-reference/emails/send-email), [chave de envio](https://resend.com/docs/create-an-api-key), [restrição do remetente de teste](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain), [controles de tokens por e-mail da OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

## Banco e ativação

Migration adicional `202611200002_autenticacao_email`: cria `links_email`, `limites_envio_email` e `emails_verificados`. Não altera registros financeiros, contas, e-mails ou senhas anteriores. Há FKs, checks de formato/finalidade, expiração e prova de uso. Não editar migrations aplicadas.

A validação desta entrega usa exclusivamente schemas descartáveis no PostgreSQL de testes (porta 5544, banco rabbu_mvp_test). **Não aplicar esta migration no banco principal sem a etapa operacional correspondente.** Para ativar no ambiente persistente: preparar backup, parar somente a API, aplicar migrations com credencial administrativa, reaplicar o comando existente de permissões e iniciar com a configuração de envio. Não recriar volumes nem executar seed/reset. Configurar a chave não aplica migrations por si só.

Na coleção Insomnia, conservar cookies nas solicitações e enviar `Origin` permitido. A confirmação deve ser feita pelo mesmo cliente que solicitou: abrir o link em um navegador não transporta o cookie do Insomnia. Para testar pelo Insomnia, preencher `emailLinkId` e `emailLinkToken` com os valores do fragmento e executar a requisição de confirmação usando o próprio cookie jar; limpar esses valores depois. Nunca exportar ou versionar tokens reais. Pelo frontend, deixar o navegador gerenciar o cookie HttpOnly.

O `down.sql` é transacional e recusa remover tabelas com registros, preservando solicitações e provas. Para recuperar a aplicação anterior, manter as tabelas/histórico e revisar a política de cadastro da versão antiga antes de disponibilizá-la. Não apagar contas ou solicitações para permitir rollback. Não há limpeza automática; retenção exige evolução específica.

## Validação

```powershell
npm run test:completo
npm --prefix interface run verificar
```

O primeiro comando inicia somente o PostgreSQL dedicado, aplica migrations em schema exclusivo e executa a regressão. O segundo executa build, tipagem, lint e navegador com API real e schema próprio. Apenas a fronteira externa de envio é controlada; banco, autorização e transações são reais. A caixa de mensagens do harness exige o identificador da execução e não faz parte do produto.

O harness do navegador cria instâncias reais de `createApp` por arquivo de teste, sobre o schema fictício da execução. Isso isola os contadores de autenticação entre suítes sem aumentar, desativar ou reiniciar artificialmente o limite dentro de uma jornada. O roteamento por cabeçalhos de teste existe só no harness e exige o identificador da execução; a aplicação distribuída não contém essa seleção. Preparação de contas para testes financeiros continua permitida diretamente no banco; as operações verificadas continuam HTTP reais. Os request specs específicos exercitam limite compartilhado entre namespaces e concorrência.

Para executar somente os request specs novos: configurar `TEST_DATABASE_URL` para o destino permitido e usar `npm run test:email`.

Os cenários cobrem cadastro pendente, confirmação/reuso, conta antiga, concorrência, cookie/origem, expiração/reenvio, bloqueio, exclusão/logout, limites por IP/e-mail, provedor indisponível, rollback real e reinício da API. O adaptador confere endpoint, chave, idempotência e erros seguros. Capturas são locais, com dados fictícios. Esses resultados não comprovam entrega real; registrar essa jornada separadamente, com chave nova e destinatário permitido.
