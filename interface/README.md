# Interface do RepHouse

O design do [PR #2](https://github.com/Mirandaszx/projeto-Rephouse/pull/2), commit `8e8ae9aeb84ad2404ee8afc474efa3c9b7986476`, é a interface principal desde 09/11/2026. Ele substitui o layout anterior na pasta `interface`, sem cópia de segurança.

Login e cadastro foram refinados com o painel verde e a casinha da referência aprovada, usando os componentes e a paleta do PR. As telas internas mantêm o design adotado. Veja a [direção visual atual](../documentacao/DIRECAO_VISUAL_FRONTEND.md).

## Executar

Com API e PostgreSQL já iniciados, na raiz do projeto:

```powershell
docker compose up -d --no-deps --force-recreate frontend
docker compose logs --tail 30 frontend
```

O comando atualiza somente o frontend e preserva os volumes. Aguarde o `npm ci` e a mensagem do Vite.

- Home: **http://localhost:5173/**
- Login: **http://localhost:5173/login**
- Cadastro: **http://localhost:5173/cadastro**
- República: `/republica`; despesas, tarefas e moradores ficam abaixo desse caminho.
- MASTER: `/admin`, após autenticação.

Os endereços antigos com `/novo` redirecionam para as rotas definitivas, preservando query e fragmento. Os endpoints do backend não mudaram.

Para executar pelo computador, com Node.js 24 e API local em 3000:

```powershell
cd interface
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Para outro backend local, informe somente a origem em `API_PROXY_TARGET`, por exemplo `http://127.0.0.1:3403`. O proxy encaminha `/api/...` para `/api/front/v1/...`, mantendo o contrato paginado principal em `/api`.

## Comportamento atual

As telas consomem a API real: cadastro/login, criação ou entrada em república, moradores, indicadores, despesas, registros manuais de pagamentos com comprovante, tarefas e consultas MASTER. Não há pagamentos Pix automáticos.

A sessão segue o PR, com JWT em `sessionStorage`. Logout e bloqueio continuam sujeitos à revogação no backend. Algumas operações do backend ainda não têm controles visuais: edição de perfil, transferência de administração, exclusão da conta e certos bloqueios.

O novo login ainda não apresenta o botão Google. A implementação Google do backend permanece disponível, mas a integração com o novo layout e a configuração do Client ID são pendências. O gráfico MASTER não recebe valores fictícios do backend.

## Verificação

O conjunto ativo é `testes-pr2/`: jornadas com navegador, API e PostgreSQL reais e conferência de home, login e cadastro em 320, 390, 768 e 1440 px. O acesso também cobre 1366×768, janela baixa, senha visível, erro longo, contraste do botão e envio duplicado. Os testes da interface substituída em `testes/` não são executados como testes do novo layout; o encerramento do ambiente isolado continua reutilizado.

Na raiz, inicie somente o banco dedicado de testes:

```powershell
docker compose -f interface/docker-compose.test.yml up -d --wait postgres
npm --prefix interface run verificar
```

O comando compila, confere os tipos, executa lint e testa a interface principal. Usa portas 5174/3405 e schemas descartáveis no banco `rabbu_mvp_test`, porta 5544, sem seed no banco da equipe. Resultados e capturas ficam em `.devops-local/`.

`test:pr2` continua disponível para testar uma cópia externa do PR, informada em `PR2_FRONTEND_PATH`; é opcional para comparar a referência e não é necessário para executar a interface principal.

Veja [integração e limites do adaptador](../documentacao/INTEGRACAO_FRONTEND_PR2.md). Em hospedagem futura, o proxy do servidor também precisará encaminhar `/api` para o adaptador; o proxy do Vite atende à execução local.
