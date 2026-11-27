# Deploy no Render

O RepHouse publicado no Render usa um único serviço web: a API (Express) também entrega a interface compilada e
traduz `/api/*` para a superfície da interface, como o Nginx faz na demonstração local. O banco é um PostgreSQL 17
gerenciado pelo Render. Tudo está descrito no `render.yaml` (Blueprint).

## O que roda

| Peça | Onde | Observação |
|---|---|---|
| Imagem | `infra/render/Dockerfile` | Compila a API e a interface; mantém o Prisma CLI para as migrações |
| Partida | `dist/comandos/iniciar-render.js` | Aplica `prisma migrate deploy` e só então sobe a API; se a migração falhar, a versão anterior continua no ar |
| Interface | `INTERFACE_DIR=/app/interface-dist` | `index.html` sem cache; `/assets` com cache longo |
| Saúde | `GET /api/ready` | Health check do Render (confirma o banco) |
| Banco | `rephouse-db` (PostgreSQL 17, plano gratuito) | `DATABASE_URL` vem do Blueprint |

Segurança das páginas: CSP só com a origem própria, o login do Google (`accounts.google.com/gsi`) e o script de
aparência do `index.html` liberado pelo hash calculado na partida (sem `unsafe-inline`).

## Primeira publicação (Blueprint)

1. No Render, **New > Blueprint** e escolha o repositório `projeto-Rephouse`, branch `main`.
2. O Render lê o `render.yaml` e propõe o serviço `rephouse` e o banco `rephouse-db`. Preencha as variáveis pedidas:
   - `BREVO_API_KEY` e `EMAIL_FROM`: necessárias para criar contas (o cadastro confirma o e-mail por link).
     O `EMAIL_FROM` precisa ser um remetente verificado no Brevo.
   - `PRIVACY_CONTACT_EMAIL`: contato da política de privacidade (opcional; sem ele, usa o `EMAIL_FROM`).
   - `GOOGLE_CLIENT_ID`: opcional; sem ele, o botão do Google não aparece.
3. Aplique o Blueprint. O primeiro build leva alguns minutos; o deploy termina quando `/api/ready` responde 200.

`JWT_SECRET` é gerado pelo Render. `CORS_ORIGINS` e `APP_PUBLIC_URL` vêm sozinhos do `RENDER_EXTERNAL_URL`
(o endereço `https://<serviço>.onrender.com`); só informe se usar domínio próprio.

## Depois do primeiro deploy

- **Brevo:** em *Security > Authorised IPs*, desative a restrição por IP. O Render não tem IP de saída fixo no plano
  gratuito, e o Brevo recusaria os envios.
- **Google (se usar):** no Google Cloud, adicione `https://<serviço>.onrender.com` em *Authorized JavaScript origins*
  do Client ID.
- **Teste rápido:** abrir a página, criar uma conta pelo link do e-mail, criar uma república, lançar uma despesa e
  registrar um pagamento.

## Limites do plano gratuito

- O serviço hiberna depois de um tempo sem acesso; a primeira visita seguinte demora cerca de um minuto.
- O PostgreSQL gratuito do Render expira depois de um período definido pelo Render; antes disso, faça backup
  (`pg_dump` pela URL externa do banco) se os dados precisarem continuar.
- Sem backup agendado nem cópia externa: o ambiente serve para demonstração, não para dados reais.

Cada push na `main` gera um novo deploy (`autoDeploy: true`).
