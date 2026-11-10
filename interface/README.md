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

No cadastro, escolha **Quero criar uma república** ou **Já tenho um código**. Primeiro a conta é criada; em seguida, `/republica` abre a opção escolhida. Na criação, informe o nome da república para gerar o código de entrada. Com convite, informe o código compartilhado por um morador. É possível mudar de opção antes de concluir. Se o código for inválido, corrija-o nessa tela, sem cadastrar a conta novamente.

O código aparece identificado como **Código de entrada**, com botão de copiar, na área **Convide um morador** da página Moradores. Ele não é o ID interno do banco. O cadastro envia somente nome, e-mail e senha à API; o parâmetro temporário `acao=criar` ou `acao=entrar` orienta a interface e é retirado da URL após concluir o vínculo. Nome da república, código, senha e token não são colocados nesse parâmetro. O login mantém o fluxo normal e os vínculos já existentes.

Validação da etapa de cadastro, em 10/11/2026: **18 testes ativos aprovados**, sem falhas ou ignorados, incluindo criação da casa, entrada por código, correção de código inválido, envio único e persistência após recarregar. Compilação, tipos e lint aprovados, com cinco avisos preexistentes de Fast Refresh. Essa evidência anterior permanece em [validacao-cadastro-republica.json](../documentacao/evidencias/validacao-cadastro-republica.json).

### Organização do painel

A visão geral reúne quatro indicadores: sua parte a pagar, pendências da república, pagamentos da casa no mês e tarefas abertas. Abaixo, mostra até cinco despesas por data de criação mais recente e até quatro tarefas abertas por prazo, com links para as listas completas. O resumo financeiro usa os mesmos dados e regras anteriores; a página Despesas mantém os filtros e a coleção completa autorizada pelo adaptador.

O código de convite fica somente em Moradores. A saída fica junto ao perfil na barra lateral do computador e em uma área de perfil visível no topo no celular. A falha na consulta das tarefas apresenta uma opção de tentar novamente, preservando os indicadores e as despesas carregadas. O resumo é somente de consulta para tarefas; conclusão e atribuição continuam na página Tarefas, com autorização do backend.

Após essa reorganização, a verificação completa da interface passou com **21 testes**, zero falhas e ignorados. Os novos cenários conferem os indicadores, limites do resumo, listas completas, erro e recuperação da consulta de tarefas, navegação em cinco larguras e revogação da sessão no logout. As jornadas de pagamento, comprovantes, tarefas e MASTER permanecem aprovadas. O limitador de autenticação continua ativo; os novos cenários reutilizam uma sessão real criada na preparação. Evidência: [validacao-painel-organizado.json](../documentacao/evidencias/validacao-painel-organizado.json).

As telas consomem a API real: cadastro/login, criação ou entrada em república, moradores, indicadores, despesas, registros manuais de pagamentos com comprovante, tarefas e consultas MASTER. Não há pagamentos Pix automáticos.

A sessão segue o PR, com JWT em `sessionStorage`. Logout e bloqueio continuam sujeitos à revogação no backend. Algumas operações do backend ainda não têm controles visuais: edição de perfil, transferência de administração, exclusão da conta e certos bloqueios.

O novo login ainda não apresenta o botão Google. A implementação Google do backend permanece disponível, mas a integração com o novo layout e a configuração do Client ID são pendências. O gráfico MASTER não recebe valores fictícios do backend.

## Verificação

### Aparência

A opção **Sistema** acompanha o tema claro ou escuro do computador, inclusive quando ele muda com a página aberta. É possível escolher **Claro** ou **Escuro** no controle de aparência: no canto superior do acesso, junto ao perfil no painel e no topo da administração. Na home, o controle fica no cabeçalho ou dentro do menu no celular.

Somente essa preferência visual é salva em `localStorage`, na chave `rephouse-appearance`, e sincronizada entre abas. Se o navegador bloquear o armazenamento, a escolha continua funcionando na aba atual. Essa configuração não altera o armazenamento da sessão. Campos, rótulos flutuantes, calendário, seleção de moradores, avisos e modais compartilham o tema; o foco por teclado e a preferência de movimento reduzido permanecem ativos.

Os cenários de aparência usam o mesmo banco dedicado dos demais testes. As capturas novas ficam em `.devops-local/interface/imagens/aparencia/`, separadas das evidências anteriores. Veja [validacao-aparencia.json](../documentacao/evidencias/validacao-aparencia.json).

Validação dessa etapa: **25 testes ativos aprovados**, sem falhas ou ignorados; compilação e tipagem aprovadas, lint sem erros e com cinco avisos preexistentes de Fast Refresh. Foram medidos contraste de texto de pelo menos 4,5:1 e de bordas de pelo menos 3:1 nos controles selecionados. Isso não constitui uma auditoria completa de acessibilidade.

O conjunto ativo é `testes-pr2/`: jornadas com navegador, API e PostgreSQL reais e conferência de home, login e cadastro em 320, 390, 768 e 1440 px. O acesso também cobre 1366×768, janela baixa, senha visível, erro longo, contraste do botão e envio duplicado. Os testes da interface substituída em `testes/` não são executados como testes do novo layout; o encerramento do ambiente isolado continua reutilizado.

Na raiz, inicie somente o banco dedicado de testes:

```powershell
docker compose -f interface/docker-compose.test.yml up -d --wait postgres
npm --prefix interface run verificar
```

O comando compila, confere os tipos, executa lint e testa a interface principal. Usa portas 5174/3405 e schemas descartáveis no banco `rabbu_mvp_test`, porta 5544, sem seed no banco da equipe. Resultados e capturas ficam em `.devops-local/`.

`test:pr2` continua disponível para testar uma cópia externa do PR, informada em `PR2_FRONTEND_PATH`; é opcional para comparar a referência e não é necessário para executar a interface principal.

Veja [integração e limites do adaptador](../documentacao/INTEGRACAO_FRONTEND_PR2.md). Em hospedagem futura, o proxy do servidor também precisará encaminhar `/api` para o adaptador; o proxy do Vite atende à execução local.
