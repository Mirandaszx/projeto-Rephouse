# RepHouse · Relatório de escolhas

As referências abaixo foram selecionadas como favoritas provisórias. Os links abaixo levam às referências de cada escolha.

| Área | Referências escolhidas | Aplicação prevista |
|---|---|---|
| Tipografia | [Nura](https://freefontdl.com/nura-font/), [Neulis](https://ladd-design.com/family/neulis/), [Refero Styles](https://styles.refero.design/) | Comparar fontes e hierarquia nas telas reais. Inter é a base CSS atual. A escolha final depende também da licença web. |
| Dashboard | [D05 · Dashboard 01](https://ui.shadcn.com/blocks#dashboard-01) | Composição da área administrativa com indicadores e tabela. |
| Navegação | [N03 · Apple Navbar](https://skiper-ui.com/v1/preview/skiper38), [N08 · Sidebar 002](https://ui.unlumen.com/components/sidebar-002), [N02 · Motion Navigation Menu](https://ui.unlumen.com/components/motion-navigation-menu), [N07 · Dock](https://ui.unlumen.com/components/dock) | Cabeçalho, menu lateral e navegação compacta no celular. |
| Abas | [N05 · Expandable Tabs](https://21st.dev/@rjcuff2000/components/expandable-tabs) e [N06 · Motion Tabs Menu](https://ui.unlumen.com/components/motion-tabs-menu) | Alternativas para a transição entre seções. |
| Formulários | [C02 · Animated Number Input](https://skiper-ui.com/v1/skiper68), [C15 · Animated Input](https://ui.unlumen.com/components/animate-text-input-typing), [C03 · Combobox](https://ui.shadcn.com/docs/components/base/combobox), [C04 · Date Picker](https://ui.shadcn.com/docs/components/base/date-picker) | Campos de valor, digitação, seleção de moradores e prazos. |
| Comprovantes | [C05 · Halo Dropzone](https://www.cult-ui.com/docs/components/halo-dropzone) | Seleção de arquivo no registro de pagamento. |
| Despesas e moradores | [C07 · Data Table](https://ui.shadcn.com/docs/components/base/data-table), [C08 · Badge](https://spell.sh/docs/badge), [C09 · Fallback Avatar](https://spell.sh/docs/fallback-avatar), [B04 · Copy Button](https://spell.sh/docs/copy-button) | Listas e situações, identificação de moradores e cópia de convite. |
| Tarefas | [C10 · Animated Checkbox](https://spell.sh/docs/animated-checkbox) e [C11 · Animated Task Checkbox](https://uiverse.io/MattiaCode-IT/wise-elephant-53), [M12 · Animated List](https://ui.unlumen.com/components/animated-list) | Comparar efeitos de conclusão e de atualização da lista. |
| Feedback | [C12 · Spinner](https://spell.sh/docs/spinner), [C13 · Skeleton](https://ui.shadcn.com/docs/components/base/skeleton), [C14 · Toast](https://ui.shadcn.com/docs/components/base/toast) | Ações em andamento, carregamento de dados e confirmação ou erro. |
| Indicadores e gráficos | [M06 · Animate Digits](https://ui.unlumen.com/components/animate-digits), [M08 · Chart](https://spell.sh/docs/chart), [M09 · Gráficos de área](https://ui.shadcn.com/charts/area) | Atualização de números, revelação e evolução de despesas ao longo do tempo. |
| Página pública | [M01 · Blur Reveal](https://spell.sh/docs/blur-reveal), [M03 · Words Stagger](https://spell.sh/docs/words-stagger), [M05 · Randomized Text](https://spell.sh/docs/randomized-text), [M14 · Tilt Card](https://spell.sh/docs/tilt-card), [M15 · Animated Gradient](https://spell.sh/docs/animated-gradient) | Alternativas de texto, cards e fundo para a página pública. |
| Mensagens | B06 · Send Button | Referência reservada para um futuro fluxo de envio de mensagens. |

O Inspora ficou pendente na curadoria por bloqueio da rede da faculdade. Sidebar 002, Motion Tabs Menu e Animated Input foram marcados como Pro. A incorporação das referências depende das condições de licença de cada peça.

## Primeira entrega

- O React implementa login, cadastro, entrada por código, criação da república, resumo e logout. O cabeçalho, os campos e o resumo já seguem a direção visual inicial com estilos próprios.
- Os componentes escolhidos continuam como referências para as próximas telas. Despesas, rateio, comprovantes, tarefas e gestão MASTER são os próximos fluxos.
- O cenário Playwright passou no Chromium desktop e celular. Ele cobre login, convite, resumo, restauração de sessão e logout com respostas controladas da API. A validação com uma API e banco em execução é uma etapa separada.

Para repetir o teste sobre o build, execute `npm run build` em `interface`, defina `PLAYWRIGHT_STATIC=1` e rode `npm run test:e2e`. Nesse modo o navegador carrega os arquivos de `dist` sem precisar subir um servidor HTTP. Os testes também aceitam um servidor em execução via `PLAYWRIGHT_BASE_URL`.
