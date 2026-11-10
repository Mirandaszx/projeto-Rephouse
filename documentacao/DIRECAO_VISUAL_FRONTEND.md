# Direção visual do RepHouse

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
