# Direção visual do RepHouse

## Avisos de login e cadastro — 18/11/2026

O texto principal orienta a correção sem exibir o identificador técnico. O código continua disponível em “Detalhes para suporte”, com ação de copiar. Por solicitação do usuário, esses avisos desaparecem após oito segundos e também podem ser fechados manualmente; hover, foco ou detalhes abertos suspendem o fechamento, e a contagem recomeça ao sair. Nova tentativa limpa o aviso anterior e recebe seu próprio temporizador. Isso se limita à autenticação: erros dos formulários internos e avisos financeiros conservam seu comportamento. Build, tipagem, lint e oito testes focados de autenticação foram aprovados, incluindo cadastro/login reais no PostgreSQL dedicado. A regressão completa de 64 testes registrada na etapa de motion é anterior a este ajuste e não foi reapresentada como validação dele. Evidência: [aviso de autenticação](evidencias/validacao-aviso-autenticacao.json).

## Motion: modais e avisos — 18/11/2026

Os diálogos internos agora entram em 180 ms e saem em 140 ms, com opacidade e deslocamento de 4 px. O diálogo permanece modal durante a saída e devolve o foco ao acionador ao terminar. O aviso flutuante de sucesso usa 180/140 ms e deslocamento de até 8 px, com fechamento manual e proteção contra uma saída antiga apagar uma mensagem nova. Teclado e movimento reduzido seguem imediatos; o deslize do filtro permanece como aprovado. Layout, cores e páginas públicas não foram alterados. Veja [implementação e validação](MOTION_PRIMEIRA_ETAPA.md).

## Refinamentos da revisão Impeccable — 18/11/2026

Foram corrigidas a leitura das pendências no celular e a legibilidade de textos auxiliares. Os formulários agora mostram uma conferência do rateio com nomes e valores por pessoa; os botões deixam explícito que registram pagamentos realizados fora do sistema. Os filtros usam “Mês do vencimento” e oferecem indicação de deslize. Pausas e meses a revisar aparecem antes de expandir as recorrências. As pendências pessoais não são repetidas na lista de despesas recentes.

A paleta, a Inter, a casinha e a composição aprovada permanecem. A home e a autenticação receberam apenas ajustes de legibilidade. Detalhes, capturas e limites estão em [Refinamentos do frontend](REFINAMENTOS_FRONTEND_2026_11.md). O [planejamento de motion design](PLANO_MOTION_DESIGN.md) registra a primeira etapa executada e as oportunidades que continuam propostas. As seções abaixo preservam as evidências históricas.

## Controles financeiros 2.2.0 — 17/11/2026

A revisão acrescenta competência e escopo aos filtros de despesas, identifica contas recorrentes e distingue situação da conta, saldo próprio e pagamento parcial. A configuração mensal fica recolhida em “Contas recorrentes”, com edição, desativação e revisão de competências. Os formulários reutilizam os botões, o seletor de moradores e os diálogos existentes.

O painel preserva a faixa de quatro indicadores e a orientação da primeira despesa; acrescenta os totais individuais do mês e uma lista de pendências próprias. O financeiro pessoal recebe agregações do backend e permite filtrar vencimentos. A troca de filtros não mantém totais antigos apresentados como se fossem do novo período. Os controles usam tokens dos temas claro e escuro, rótulos visíveis e rolagem local do filtro em telas estreitas. Home, login, cadastro e a casinha não foram modificados.

Capturas desta revisão ficam em `.devops-local/interface/imagens/financeiro-22/`, separadas das anteriores. Resultados e limitações são registrados em `evidencias/validacao-financeiro-2-2.json`; as validações abaixo pertencem às revisões históricas indicadas.

## Painel da referência com a primeira despesa — 12/11/2026

A visão geral volta à composição escolhida na imagem: faixa com quatro indicadores, parte pessoal em verde, botão “Nova despesa” no cabeçalho e painéis de despesas recentes e tarefas pendentes abaixo. A orientação da primeira despesa permanece dentro do painel de despesas, com o mesmo formulário, permissões, bloqueio durante envio e links de apoio. Os indicadores continuam visíveis mesmo quando zerados.

O carregamento e a falha das tarefas continuam distintos de uma casa sem registros; a orientação inicial só aparece após confirmação dos dados. A adaptação ao celular e os temas são preservados. Esta revisão substitui a composição sem cartões da seção seguinte; seus resultados anteriores ficam registrados como históricos. Capturas novas: `.devops-local/interface/imagens/painel-primeira-despesa/`.

Validação final: build e tipagem aprovados, lint sem erros com cinco avisos preexistentes e onze testes focados aprovados, sem ignorados. A primeira execução teve um timeout de título durante navegação; o cenário isolado e a repetição dos onze testes passaram sem alterar o comportamento da aplicação. A causa não foi determinada e permanece registrada. No servidor 5173, 24 combinações de largura, tema e perfil mantiveram os indicadores, os painéis e o formulário da primeira despesa, sem erros JavaScript ou rolagem horizontal. Evidência: `evidencias/validacao-painel-primeira-despesa.json`. Sem novo commit ou push.

## Visão geral sem cartões vazios — 12/11/2026

Quando despesas, tarefas e indicadores confirmam que ainda não há registros, a visão geral apresenta uma orientação única. O administrador pode abrir o formulário existente por “Registrar primeira despesa” ou acessar as tarefas. O morador recebe uma explicação compatível com seu perfil e acesso aos moradores. O resumo financeiro permanece acessível.

A orientação só aparece depois do carregamento bem-sucedido das tarefas e não esconde valores do painel. Com registros, as listas continuam disponíveis; a parte pessoal zerada usa a superfície comum e as legendas repetidas foram retiradas. As cores, o login, a casinha, as APIs e o banco permanecem preservados. A revisão continua local em `experimento/layout-compacto`, sem commit adicional ou push.

Build, tipagem e lint passaram, com cinco avisos preexistentes de Fast Refresh. Os onze testes focados passaram sem falhas ou ignorados, incluindo acesso ao formulário, diferenças por perfil e preservação de valores, falhas e carregamento. A suíte completa não foi repetida nesta revisão. A conferência local cobriu 24 combinações de largura, tema e perfil, além do saldo pessoal zerado nos dois temas e do retorno às listas com registros. As novas capturas e medições ficam em `.devops-local/interface/imagens/resumo-inicial/`, `.devops-local/resumo-inicial-servidor.json` e `evidencias/validacao-resumo-inicial.json`; os resultados da experiência compacta abaixo são anteriores a este ajuste.

## Experiência de layout compacto na visão geral — 12/11/2026

A composição escolhida mantém as cores do commit `35da751` e reúne os quatro indicadores em uma faixa. O saldo pessoal mantém seu destaque verde; os outros três indicadores ficam alinhados ao lado. Em larguras menores, a faixa se reorganiza para preservar a leitura dos valores.

A lista de despesas recebe mais largura no computador e alinha descrição, valor e ação na mesma linha. Nas tarefas, responsável, prazo e atraso ficam agrupados abaixo do título. No celular, as informações se reorganizam sem esconder valores, ações ou estados. Login, cadastro, home, casinha, navegação, APIs e banco permanecem como no commit de retorno.

A experiência está em `experimento/layout-compacto`, sem novo commit ou push. As capturas novas ficam em `.devops-local/interface/imagens/layout-compacto/`; a sonda usa respostas fictícias para todas as chamadas da API e registra resultados em `.devops-local/layout-compacto-servidor.json`. Os resultados completos das seções anteriores permanecem históricos.

Validação desta revisão: build, tipagem e lint sem erros (cinco avisos preexistentes de Fast Refresh); dez testes existentes de painel, temas e responsividade aprovados, sem falhas ou ignorados. A conferência na porta 5173 cobriu 36 combinações de tamanho, tema e dados, sem rolagem horizontal nem erros JavaScript. Em 1440 px, a faixa mede aproximadamente 168 px de altura, e os painéis de despesas e tarefas medem 687 e 417 px. Paleta, home e autenticação foram conferidas contra o commit de retorno. Evidência resumida em `evidencias/validacao-layout-compacto.json`. A suíte completa de 46 testes não foi repetida nesta revisão de layout.

## Deslize do filtro de despesas — 12/11/2026

O destaque de Todas/Pendentes/Pagas desliza horizontalmente em 350 ms, com aceleração e desaceleração suaves. A duração maior atende à preferência visual escolhida; os dados filtrados continuam disponíveis imediatamente. A marcação usa uma transição CSS de `transform`, restrita a esse filtro, preservando o controle Glisse e sua navegação por teclado. Por escolha explícita do usuário, o clique mantém esse deslize mesmo quando o Windows solicita movimento reduzido. Teclado continua imediato; as demais animações seguem a preferência do sistema.

A primeira conferência registrou o comportamento inicial, que desativava o deslize com movimento reduzido, em `.devops-local/deslize-filtro.json`. A revisão da exceção solicitada tem evidências separadas em `.devops-local/deslize-filtro-clique.json` e `.devops-local/interface/imagens/deslize-filtro-clique/`. Os resultados das suítes completas abaixo pertencem às revisões anteriores.

A exceção passou em oito combinações: 390/1440 px, claro/escuro e movimento normal/reduzido. Foram conferidos quadros intermediários do clique, posição final, teclado imediato, ausência de rolagem horizontal e preservação da redução dos demais efeitos. A preferência real do Windows também retornou movimento reduzido com duração de 350 ms apenas no destaque. Build e tipagem passaram; lint terminou sem erros, com cinco avisos preexistentes de Fast Refresh.

## Transição entre páginas — 12/11/2026

A navegação da área interna agora troca o conteúdo dentro do mesmo documento. Entre visão geral, despesas, tarefas, moradores e configurações, a lateral permanece montada; o conteúdo pronto entra com opacidade e deslocamento de 8 px, em 200 ms, usando Motion. Perfil e financeiro mantêm seu cabeçalho de conta e recebem a mesma entrada ao navegar por links internos.

A sessão e os dados são consultados novamente a cada destino. Enquanto a consulta está pendente, os formulários da página anterior deixam de aparecer. Falhas oferecem nova tentativa; sessão revogada encaminha ao login. Voltar, avançar e recarregar continuam funcionando. Links públicos, externos, com fragmento, download, nova aba ou teclas modificadoras mantêm o comportamento nativo. A navegação por teclado abre o conteúdo imediatamente e move o foco ao conteúdo; movimento reduzido desativa a entrada.

O frontend combina Tailwind CSS 4 nos componentes, CSS próprio para a identidade e os temas e Motion para a entrada de página. As rotas públicas, APIs, tipos públicos, banco e versão 2.1.0 permanecem como estavam.

Validação local: **46 testes aprovados**, zero falhas ou ignorados, build e tipagem aprovados e lint sem erros, com cinco avisos preexistentes. A captura na porta 5173 conferiu oito combinações de 390/1440 px, claro/escuro e movimento normal/reduzido: o documento e a lateral foram preservados; os quatro cenários com movimento normal apresentaram quadros intermediários, e os quatro com movimento reduzido apareceram diretamente. Capturas e medições ficam em `.devops-local/interface/imagens/navegacao-fluida/` e `evidencias/validacao-navegacao-fluida.json`.

## Ajustes do modo escuro e fluidez — 11/11/2026

Os painéis de despesas recentes e tarefas pendentes passam a usar bordas, cantos e espaçamento interno consistentes nos dois temas. No escuro, o fundo fica mais neutro, as superfícies se distinguem do conteúdo principal e o resumo pessoal mantém seu verde e seu contraste. Regras específicas das telas internas impedem que os estilos antigos voltem a preencher os indicadores secundários com retângulos de outra cor. Menus de filtro permanecem no contêiner interno para herdar os mesmos tokens.

| Antes | Depois | Motivo |
| --- | --- | --- |
| Casinha repetida nos estados vazios | Título e explicação sem ícone | Reduzir a repetição visual; a marca e a casa do login continuam presentes |
| Fundos escuros sobrepostos aos estilos novos | Superfícies com bordas, cantos e respiro definidos | Corrigir a cascata e manter uma hierarquia legível |
| Troca instantânea de resultados por ponteiro | Opacidade de 160 ms, sem deslocar linhas | Suavizar a substituição sem atrasar o resultado ou remontar formulários |
| Painel do modal aparecia separado do fundo | Entrada coordenada de painel e backdrop em 180 ms | Dar continuidade à abertura e manter o acesso imediato |

Filtros de despesas e tarefas e abas MASTER usam uma transição interrompível pela Web Animations API. Mudanças rápidas cancelam a anterior; teclado e movimento reduzido dispensam o efeito. A abertura de menus usa as transições do Base UI, de 150 ms, com origem no acionador; botões mantêm pressão discreta e a conclusão de tarefa mantém o feedback Motion de 160 ms. Não há animação contínua, entrada de cada linha ou alteração dos valores financeiros durante a leitura.

As evidências desta revisão ficam em `evidencias/validacao-escuro-fluidez.json`; as capturas novas ficam em `.devops-local/interface/imagens/escuro-fluidez/`. Os resultados anteriores abaixo são históricos. Home, login, cadastro, APIs, banco e versão 2.1.0 permanecem preservados.

Verificação completa final: **43 testes aprovados**, sem falhas ou ignorados; build, tipagem e lint aprovados, com cinco avisos preexistentes de Fast Refresh. A primeira execução teve uma navegação interrompida no teste de edição de tarefa; a jornada passou isoladamente e a repetição completa passou sem mudanças no teste ou retries. A causa desse evento isolado não foi determinada e permanece registrada na evidência.

## Modernização das telas internas — 11/11/2026

A direção escolhida para esta etapa é acolhedora e editorial: lateral em verde profundo `#205448`, fundo claro mais quente `#f7f5ef`, superfícies brancas, texto `#193732` e seleção em verde-claro `#d2ec9c`. Home, login, cadastro e a casinha conservam sua composição. As regras novas são limitadas ao contêiner das telas internas, incluindo seus temas claro e escuro.

A lateral separa os destinos da casa das opções da conta. Tem 248 px no computador e 208 px entre 720 e 1023 px; abaixo disso permanecem os quatro destinos na navegação inferior. Perfil e financeiro mantêm um cabeçalho compacto e continuam disponíveis sem república ativa. A fonte Inter local é compartilhada, com títulos de 36/28 px, texto principal de 16 px e informações secundárias de 14 px.

O resumo pessoal ganha o destaque principal; os indicadores da casa formam uma faixa secundária. Despesas e tarefas usam listas e divisórias em vez de cartões repetidos. Os estados financeiros e os atrasos de tarefas têm texto, além da cor. Moradores aparecem com iniciais, perfil e situação; o convite continua separado. O financeiro pessoal agrupa os registros por república e identifica vínculos anteriores. No MASTER, os diretórios conservam busca, filtros, paginação e bloqueios; um gráfico só é apresentado quando a resposta contém uma série disponível.

Cabeçalhos, marca, estados vazios, iniciais e badges ficam em `interface/codigo/interno`. Os botões continuam Glisse; campos e checkboxes reutilizam Spell UI; popovers continuam Base UI, ícones Lucide e feedback discreto Motion/CSS. Os formulários internos usam rótulos externos. Filtros e navegação não recebem animações de entrada de listas; o feedback de conclusão é curto, com movimento reduzido respeitado.

As orientações de Taste e Emil foram adaptadas ao aplicativo de uso diário e ao escopo aprovado: composição, consistência, conteúdo real, legibilidade e resposta às interações. As receitas de landing page e efeitos decorativos não fazem parte desta etapa. Não houve mudança em API, tipos públicos, banco ou versão 2.1.0.

As novas capturas ficam em `.devops-local/interface/imagens/modernizacao-interna/`. A evidência desta etapa distingue cenários visuais com respostas controladas das jornadas HTTP com PostgreSQL dedicado; resultados e limitações ficam em `evidencias/validacao-modernizacao-interna.json`.

Validação final local: **40 testes aprovados**, zero falhas e zero ignorados; compilação e tipagem aprovadas, lint sem erros e com os cinco avisos preexistentes de Fast Refresh. A interface servida na porta 5173 foi conferida com respostas controladas em 390 e 1440 px, sem erros JavaScript ou rolagem horizontal. O reflow equivalente a zoom de 200% foi testado; zoom nativo e celular físico não foram exercitados. Não houve commit, push ou publicação.

## Design atual: PR #2

Em 09/11/2026, o usuário escolheu o design do [PR #2](https://github.com/Mirandaszx/projeto-Rephouse/pull/2) para substituir a interface anterior. Home, login, cadastro, república, tarefas e MASTER dessa referência estão na pasta `interface` e são servidos em `http://localhost:5173`. Não foi criada uma cópia de segurança do layout anterior.

A API principal foi preservada. O novo frontend utiliza o adaptador `/api/front/v1`. O botão Google e alguns controles presentes na implementação anterior ainda precisam ser integrados ao novo layout. Veja o [guia atual](../interface/README.md).

## Login e cadastro: casinha com a paleta do PR

O acesso foi refinado a partir da foto `WhatsApp Image 2026-11-09 at 18.55.55.jpeg`, aprovada pelo usuário. O painel ocupa 46% da área útil no computador, com margem externa de 12 px e cantos de 18 px. Mantém a marca, a chamada “Sua casa. Nosso ponto de encontro.”, o título em quatro linhas e a casa com plantas, janelas, porta e círculo lateral.

A ilustração é um SVG local decorativo, recriado a partir da referência, sem imagem externa. A paleta usa painel `#205448`, texto `#193732`, botão `#d2ec9c`, casa creme, janelas amarelas e plantas em verde suave. O texto do botão permanece escuro, inclusive com os estilos do Glisse carregados.

O formulário branco tem até 440 px, campos de 54 px e rótulos externos. Login apresenta “Bem-vindo de volta.”; cadastro apresenta “Sinta-se em casa.”. Abaixo de 900 px, o painel é ocultado e a marca aparece sobre o formulário. Janelas baixas e mensagens longas podem rolar; nas alturas usuais, o conteúdo cabe sem espaço adicional de rolagem.

Tecnologias reutilizadas: React, TypeScript, Tailwind/CSS, botão Glisse, campos Spell UI, ícones Lucide e entrada Motion de 180 ms. A entrada usa opacidade e deslocamento de 6 px, sem desfoque, e respeita movimento reduzido. A casa permanece estática. O campo Spell mantém sua variante flutuante nos formulários internos.

Autenticação, sessão, rotas e API 2.1.0 continuam com o comportamento existente. Durante o envio, os campos e o botão ficam desabilitados; uma trava imediata impede submissão duplicada. Google, recuperação de senha e “lembrar de mim” não fazem parte deste refinamento.

As capturas desta etapa ficam separadas em `.devops-local/interface/imagens/login-casinha-pr2/`; as evidências das etapas anteriores são históricas e não são substituídas por essas capturas.

Validação local: compilação, tipagem e lint aprovados, com os cinco avisos de Fast Refresh já presentes no PR. A suíte ativa passou com **10 testes**, sem falhas ou testes ignorados, incluindo a criação de tarefa com o campo flutuante interno. Login e cadastro foram abertos também no serviço real da porta 5173, sem erros JavaScript e sem rolagem em 1440×900. Os detalhes estão em [validacao-login-casinha-pr2.json](evidencias/validacao-login-casinha-pr2.json).

## Cadastro com escolha da república — 10/11/2026

O formulário de cadastro agora oferece duas opções com seleção por teclado: “Quero criar uma república” e “Já tenho um código”. O texto explica que o nome ou código será informado depois de criar a conta. A escolha não altera o contrato de cadastro e não cria vínculos automaticamente; orienta a opção inicial da próxima tela, onde a pessoa confirma a operação e pode mudar de escolha.

O painel verde, a casinha, os campos de 54 px e o login foram preservados. O cadastro usa espaçamentos próprios para acomodar as opções em 1366×768; celulares e janelas baixas mantêm rolagem normal. A tela de escolha da casa ocupa a largura central no computador, sem reservar espaço para uma barra lateral ausente. Na visão geral e em Moradores, o convite recebeu o rótulo “Código de entrada”. Capturas desta etapa ficam em `.devops-local/interface/imagens/cadastro-republica/`, separadas das anteriores.

Validação: **18 testes ativos aprovados**, sem falhas ou ignorados; build, tipagem e lint aprovados, com os cinco avisos preexistentes. Cadastro e escolha da casa conferidos em 320, 390, 768, 1366 e 1440 px. Login e cadastro cabem sem rolagem vertical em 1366×768 e 1440×900. O cadastro servido na porta 5173 foi conferido após reiniciar somente o frontend: opções visíveis, sem erros JavaScript ou rolagem em 1366×768, sem enviar formulário ao banco da equipe. Evidência em [validacao-cadastro-republica.json](evidencias/validacao-cadastro-republica.json).

## Reorganização do painel — 10/11/2026

O painel interno ganhou uma hierarquia comum: saudação e identificação da república, quatro indicadores agrupados e dois painéis com despesas recentes e tarefas pendentes. Títulos, bordas, espaçamentos e ações usam a mesma identidade verde e superfícies claras. O conteúdo financeiro não se repete em uma segunda linha de totais. O resumo limita os registros visíveis e oferece links para as páginas completas.

A faixa superior dedicada apenas à saída foi removida. No computador, “Sair” fica junto ao perfil na lateral; no celular, o perfil e a saída ficam acima do conteúdo, mantendo a navegação inferior. O código de entrada fica em uma área própria de convite na página Moradores. Login, cadastro e casinha permanecem como estavam.

Capturas desta etapa ficam em `.devops-local/interface/imagens/painel-organizado/`, separadas das etapas anteriores. A mudança usa apenas endpoints existentes, com controle de permissões preservado no backend.

Validação local: **21 testes aprovados**, sem falhas ou ignorados; compilação, tipagem e lint aprovados, com cinco avisos preexistentes de Fast Refresh. Visão geral, despesas, tarefas e moradores conferidos em 320, 390, 768, 1366 e 1440 px, sem rolagem horizontal. As capturas finais da visão geral em computador e celular foram inspecionadas. A navegação inferior usa links de página com ícones Lucide e identificação da página atual, mantendo os rótulos visíveis. Não houve alteração em API, tipos públicos, banco, dependências ou versão 2.1.0. Veja [validacao-painel-organizado.json](evidencias/validacao-painel-organizado.json).

## Aparência do sistema e escolha manual — 10/11/2026

O tema passou a ter uma única preferência para home, login, cadastro, painel e MASTER. Por padrão, **Sistema** acompanha o modo do computador. O controle de aparência permite fixar **Claro** ou **Escuro**, preserva a escolha ao recarregar e a comunica às outras abas. Ele usa um seletor nativo com nome acessível e foco visível; a versão compacta mantém área de 44 × 44 px.

No tema escuro, fundos usam `#101b18` e `#192922`, texto principal `#e9f3ed`, texto secundário `#b3c8bc` e destaques `#b4d991`. A casinha e o painel de boas-vindas mantêm sua ilustração e identidade. O tema claro conserva a composição anterior, com bordas dos campos mais perceptíveis. Os rótulos flutuantes usam o mesmo fundo do campo, corrigindo os blocos pretos que apareciam em modais claros quando o computador estava no modo escuro. Calendário, seleção de moradores, avisos e controles nativos seguem a preferência efetiva.

O carregamento inicial aplica o tema antes de montar a interface. O modo de alto contraste do sistema conserva suas cores forçadas e o foco; a escolha funciona em memória quando o armazenamento está bloqueado. Isso não substitui uma auditoria completa de acessibilidade ou testes com tecnologias assistivas.

Capturas e resultados desta etapa ficam em `.devops-local/interface/imagens/aparencia/` e [validacao-aparencia.json](evidencias/validacao-aparencia.json). As evidências anteriores permanecem históricas. Não há alteração em APIs, banco, autenticação, dependências ou versão 2.1.0.

Verificação local aprovada com **25 testes**, zero falhas e ignorados, compilação e tipagem aprovadas e os cinco avisos de Fast Refresh já existentes. Os controles selecionados passaram nas medições de 4,5:1 para texto e 3:1 para bordas. Foram conferidos modais claros e escuros, preferência do sistema, escolha manual persistente, sincronização de abas, armazenamento bloqueado e foco em cores forçadas. A porta 5173 também foi conferida em navegador sem enviar formulários ao banco da equipe.

## Gestão de conta e república — 10/11/2026

Perfil, financeiro pessoal e configurações foram organizados em páginas próprias, mantendo a paleta verde, superfícies e preferência de aparência. Os atalhos ficam junto ao perfil no computador e no topo no celular. A navegação inferior conserva as quatro páginas principais. As ações de edição ficam no contexto do registro, e ações que encerram vínculos ou alteram acesso recebem confirmação.

Formulários usam campos nativos rotulados, foco visível e bloqueio durante envio. A tabela MASTER mantém as ações com texto inteiro e permite rolar a tabela em telas estreitas sem ampliar a página. Capturas novas ficam em `.devops-local/interface/imagens/gestao/`, separadas das anteriores. Consulte [as funcionalidades e permissões](FUNCIONALIDADES_INTERFACE.md) e [a validação desta etapa](evidencias/validacao-gestao-interface.json).

## Histórico das escolhas anteriores

Escolha do usuário em 05/11/2026: **clara e acolhedora, com tons verdes e clima de casa**.

A proposta usa fundo quase branco, verde nas ações principais, detalhes em areia e uma ilustração de casa no acesso. O painel mantém navegação lateral no computador e uma navegação compacta no celular. Moradores e tarefas têm informações e ações visíveis, sem depender de passar o mouse.

## Base visual aplicada

| Uso | Cor |
| --- | --- |
| Ações principais | `#23644d` |
| Área de boas-vindas do acesso | `#224e3d` |
| Botão principal do acesso | `#d2ec9c` com texto `#183b28` |
| Fundo da aplicação | `#f6f7f2` |
| Texto principal | `#263c31` |
| Superfícies | `#ffffff` |
| Destaques suaves | `#e9f1e3` |

Os componentes têm foco visível, feedback ao pressionar, mensagens de erro e estados de carregamento. Movimentos são reduzidos quando o usuário solicita essa preferência no sistema.

## Pesquisa no Refero

O catálogo público indicou as referências abaixo. As imagens completas dessas páginas não puderam ser inspecionadas nesta consulta; elas são opções para o grupo abrir e comparar, não telas copiadas para o projeto. A paleta verde foi escolhida pelo usuário.

| Referência | O que observar ao comparar |
| --- | --- |
| [Todoist — tarefas](https://refero.design/screens/bcd46332-e73a-4d75-a00d-b913ae793d65) | Como apresentar uma lista, indicar conclusão e destacar a ação principal. |
| [Linear — gestão de tarefas](https://refero.design/screens/916c7762-622d-49eb-a502-df8bcfbef388) | Organização das informações, navegação e janela de criação de tarefa. |
| [Structured — configuração inicial](https://refero.design/screens/d9fdec29-2888-4c54-b7e4-4d56f2c9988f) | Como orientar a pessoa no primeiro acesso e na configuração inicial. |

No Refero, procure na categoria de aplicações web por `task management`, `community dashboard` e `property management dashboard`. Combine os filtros `Log In`, `Task Management`, `Cards & Tiles`, `Sidebar & Drawer` e `Dialog & Modal Window`. O [guia de pesquisa do Refero](https://refero.design/how-it-works) explica a combinação de filtros e a busca por nome de produto.

Para cada referência escolhida pelo grupo, vale registrar a tela, o detalhe que ajuda o RepHouse e uma adaptação concreta. As mudanças de visual devem preservar o contrato da API e as permissões já testadas.

## Primeira parte implementada

Login/cadastro, perfil, entrada/criação/troca/saída de república, moradores e tarefas já usam a API existente. Os testes de navegador validam essa integração em PostgreSQL dedicado. O acesso Google foi acrescentado na versão 2.1.0; sua validação real depende do Client ID e de uma conta de teste. Pix, telas financeiras, exclusão de conta pela interface e administração global MASTER continuam fora desta entrega.

## Referência escolhida para o acesso

A captura da Wise orientou a primeira revisão do formulário. Na escolha seguinte, o usuário preferiu combinar esse formulário com o painel da foto do primeiro design: margem externa de 14 px, painel verde arredondado em aproximadamente 46% da área, marca no topo, chamada “Sua casa. Nosso ponto de encontro.”, título “Dividir a casa. Compartilhar uma boa rotina.”, texto de apoio e casa abaixo.

O formulário mantém largura máxima de 440 px, campos de pelo menos 54 px e botão verde-claro arredondado. A marca aparece apenas no painel no computador. Abaixo de 900 px, o painel é ocultado e a marca passa para cima do formulário. Telas baixas usam rolagem normal, incluindo cadastros com mensagens extensas. Login e cadastro compartilham a composição; as telas internas conservam o visual anterior.

A captura tinha uma ajuda aberta e o restante esmaecido. Esse estado não foi reproduzido como aparência normal. O botão Google é renderizado pelo SDK oficial quando configurado. Apple, recuperação de senha e persistência de sessão não foram adicionados.

As imagens de revisão são produzidas localmente pelos testes e ficam em `.devops-local/interface/imagens/`. Ainda faltam avaliação com o grupo, testes em celular físico e testes de usabilidade com moradores.

As capturas desta combinação ficam em `imagens/login-painel-foto/`, separadas das capturas anteriores. A evidência correspondente é `documentacao/evidencias/validacao-login-painel-foto.json`. O backend, os contratos, a versão 2.1.0 e a configuração Google não foram modificados nesta revisão visual.

Na correção seguinte, o usuário esclareceu que o painel esquerdo da foto deveria ser preservado. Foram retomados o verde original `#1d5140`, os cantos de 17 px, espaçamentos e tipografia originais, a casa com o tamanho anterior e o ícone circular do rodapé. O título segue as quatro linhas da foto: “Dividir a casa.”, “Compartilhar”, “uma boa”, “rotina.”. O formulário atualizado permanece à direita. As novas capturas ficam em `imagens/painel-original-restaurado/`; as anteriores foram preservadas.

O ajuste posterior de altura elimina a rolagem excedente no desktop: a casa ocupa o espaço disponível no painel e os espaçamentos se adaptam às telas mais baixas. Login e cadastro foram conferidos sem rolagem em 1366×768, 1536×864, 1440×900, 1440×1000 e 1920×1080. Em celulares, janelas muito baixas ou estados com conteúdo adicional, a rolagem continua disponível para não esconder controles. Não há bloqueio global de rolagem no navegador.
