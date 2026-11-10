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
