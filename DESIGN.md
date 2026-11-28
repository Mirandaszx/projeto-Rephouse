---
name: RepHouse
description: Interface acolhedora para organizar moradores, tarefas e contas da casa.
colors:
  green: "#205448"
  lime: "#d2ec9c"
  canvas: "#f7f5ef"
  surface: "#ffffff"
  text: "#193732"
  muted: "#596960"
  border: "#dedfd5"
  control-border: "#7b8c80"
  dark-canvas: "#151c19"
  dark-surface: "#1e2924"
  dark-text: "#eef4ed"
  dark-muted: "#b8c8bd"
typography:
  headline:
    fontFamily: "RepHouse Inter, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: 1.16
  body:
    fontFamily: "RepHouse Inter, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    lineHeight: 1.5
  label:
    fontFamily: "RepHouse Inter, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
rounded:
  field: "10px"
  panel: "14px"
  auth-panel: "18px"
  pill: "999px"
spacing:
  small: "8px"
  control: "12px"
  normal: "16px"
  section: "24px"
  large: "32px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
  button-auth:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
  button-secondary:
    backgroundColor: "#eeeae1"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    height: "48px"
  badge:
    backgroundColor: "#e8eee3"
    textColor: "{colors.green}"
  navigation:
    backgroundColor: "{colors.green}"
    textColor: "#f5f6e9"
---

# Design System: RepHouse

## Overview

Direção já aprovada: **acolhedora e editorial**, com verde profundo, fundos claros quentes e composição prática. A referência verbal permanece “Dividir a casa. Compartilhar uma boa rotina.”. Este documento registra o sistema existente, sem propor outra identidade.

Telas internas priorizam leitura de saldos, vencimentos, responsáveis e ações. Home e autenticação têm composição própria. O histórico das decisões continua em `documentacao/DIRECAO_VISUAL_FRONTEND.md`; esta é a referência resumida do estado atual.

## Colors

Os tokens acima descrevem o tema claro das telas internas; `interface/codigo/interno/workspace.css` contém os valores executáveis e as variantes escuras. Use `--app-canvas`, `--app-surface`, `--app-text`, `--app-muted`, `--app-control-border` e `--app-accent` nos componentes internos. No escuro, o destaque de ação passa a verde-claro e seu texto permanece escuro.

Estados usam `Badge` com `neutral`, `success`, `warning` e `danger`, sempre acompanhados de texto. Erros usam `--workspace-error-bg`, `--workspace-error-text` e `--workspace-error-border`; não inventar uma paleta por formulário. Alertas de pagamento parcial são independentes da situação de vencimento.

## Typography

Inter variável local, com fallback do sistema. Corpo de 16 px e informações secundárias de 14 px. Títulos principais de 36 px no computador e 28 px no celular; seções de 20 px. Valores usam numerais tabulares. Nomes e descrições podem quebrar linha.

## Layout

O perfil reutiliza o sistema interno: foto circular de 96 px com ações de adicionar/trocar/remover, nome editável, dados de conta/casa somente para consulta e exclusão separada. O editor usa recorte circular ajustável, zoom rotulado e o diálogo compartilhado, com a imagem anterior preservada até a confirmação. Avatares recebem fotos por consulta autenticada em memória; ausência/erro preserva iniciais. Não transformar os dados de consulta em novos campos obrigatórios.

Na visão geral, as ações do cabeçalho são o sino e um atalho circular de 48 px para **Meu perfil**, com ícone Lucide, nome acessível e foco visível. A ação **Nova despesa** permanece no cabeçalho da página de despesas; a orientação para registrar a primeira despesa continua na visão geral quando a casa está vazia. A troca preserva os temas e o espaçamento de 16 px entre os controles.

O controle de aparência ocupa a posição imediatamente à esquerda do sino nas telas internas: cápsula de 104 × 44 px, sol à esquerda e lua à direita, com indicador deslizante. Clicar em um dos lados escolhe **Claro** ou **Escuro**; arrastar acompanha o gesto e confirma ao soltar, enquanto cancelar mantém a preferência. A transição de 220 ms usa somente `transform`, fica imediata por teclado ou movimento reduzido e não anima o conteúdo da página. O botão tem semântica de switch, nome acessível “Modo escuro” e foco visível; Espaço/Enter alternam e setas escolhem o lado. Não repetir o controle na lateral ou na área de conta do celular. Perfil, financeiro, onboarding e MASTER usam o mesmo componente. A preferência continua salva e sincronizada entre abas. Uma preferência antiga `system` é exibida como o tema efetivo até uma escolha manual; páginas públicas preservam o controle existente.

Navegação interna de 248 px no computador e 208 px entre 720 e 1023 px. Abaixo de 720 px, quatro destinos na navegação inferior e controles da conta acima do conteúdo. Reservar espaço para essa navegação e a área segura do dispositivo.

Perfil e financeiro pessoal usam cabeçalho compacto, inclusive sem vínculo ativo. Login/cadastro preservam margem de 12 px, painel de 46% e formulário de até 440 px. Abaixo de 900 px, o painel ilustrado é ocultado. Janelas baixas e mensagens longas podem rolar.

## Elevation & Depth

Superfícies internas usam principalmente bordas de 1 px, divisórias e contraste tonal. O menu móvel possui sombra discreta; diálogos usam backdrop para comunicar bloqueio do conteúdo. Não espalhar efeitos de vidro pelos registros financeiros.

## Shapes

Campos internos com cantos de 10 px e painéis de 14 px. Botões de ação arredondados, com alvo mínimo de 44 px; campos internos de 48 px e campos de autenticação de 54 px. O painel ilustrado do acesso conserva cantos de 18 px.

## Components

- **Botões:** `GlisseButton`, preservando estados de envio, foco e desabilitado. Navegação usa links quando apropriado.
- **Campos:** rótulos externos, Spell UI e controles nativos. Formulários em envio não permitem submissão duplicada.
- **Estados financeiros:** `financialState` e `Badge`; preferir a situação e a data de referência fornecidas pelo backend. Não recalcular saldos para substituir os totais do servidor.
- **Erros:** `ErrorNotice` e `SupportDetails`. Mensagem de orientação visível; `requestId` recolhido e copiável. Nenhum desaparecimento automático de erro operacional essencial. O aviso do login mantém seu temporizador com pausa para leitura.
- **Modais:** `useDialogMotion`, modal nativo, foco dentro do formulário após remontagem e retorno ao acionador. Ações destrutivas priorizam Cancelar. Fechamento após confirmação da API.
- **Reenvio:** em resultado incerto, mostrar uma orientação principal, bloquear edição e permitir reenvio manual com a mesma chave e corpo. Conservar a tentativa ao fechar/reabrir na mesma tela.
- **Filtros:** preservar a animação horizontal de seleção aprovada, inclusive a exceção escolhida para movimento reduzido. Sem barra, setas laterais ou instrução extra no filtro de despesas; manter teclado e toque.
- **Casa ilustrada:** SVG local do login/cadastro; não repetir como decoração nos estados vazios internos.
- **Acesso por e-mail:** a tela que iniciou o pedido recebe o código de seis dígitos enviado ao e-mail, com suporte a colar e preencher automaticamente. Confirmar o código abre a sessão. Se for necessário criar a conta, a tela pede nome e senha após verificar o código.
- **Notificações:** sino estático com contador de não lidos e 16 px de separação da ação principal; painel ancorado no computador e diálogo adaptado no celular. Todas reúne tarefas, despesas e entrada/saída de moradores; Tarefas/Despesas mantêm seus filtros. As três abas têm contagens e navegação por teclado, com espaçamento adaptado em 320 px. Abrir não consome avisos. Clique marca individualmente e consulta o destino; avisos gerais abrem Moradores. Carregamento, erro e reconexão têm mensagens distintas. Entrada até 180 ms, imediata por teclado ou movimento reduzido. Não repetir casinha nem animar cada linha.
- **Tarefas compartilhadas:** distinguir Disponível para assumir, responsável atual, conclusão e responsável inativo. Moradores podem criar e assumir tarefas; controles administrativos aparecem somente quando pertinentes, com autorização definitiva no backend.

## Do's and Don'ts

- **Do:** preservar a paleta e a casinha aprovadas; distinguir conta da casa e parcela individual.
- **Do:** conferir claro/escuro, teclado, conteúdo longo e telas estreitas antes de concluir.
- **Do:** usar motion existente para feedback breve; diálogos em 180 ms na entrada e 140 ms na saída, com alternativa imediata para teclado/movimento reduzido.
- **Don't:** animar números financeiros ou cada linha das listas; acrescentar animação permanente na casa.
- **Don't:** misturar UUID de suporte com a mensagem principal ou representar uma falha de consulta como lista vazia.
- **Don't:** redefinir estilos globais para corrigir uma única tela. Consolidar regras legadas somente com comparação visual e regressão.
