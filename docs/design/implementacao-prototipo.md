# Protótipo RepHouse

| Área | Componente original no protótipo |
|---|---|
| Home | [Blur Reveal](https://spell.sh/docs/blur-reveal), [Tilt Card](https://spell.sh/docs/tilt-card) e [Animated Gradient](https://spell.sh/docs/animated-gradient), do registro Spell UI. O gradiente permite pausar o movimento. |
| Ações e navegação | Button, Tab Bar e Segmented Control do pacote oficial [Glisse](https://glisse.kelvinzhang.ca/). |
| Convite da casa | [Copy Button](https://spell.sh/docs/copy-button) do registro Spell UI, localizado e adaptado para confirmar a cópia real. |
| Registro de pagamento | [Halo Dropzone](https://www.cult-ui.com/docs/components/halo-dropzone) do registro Cult UI, com um comprovante opcional e validação de formato e tamanho. |
| Diretórios do painel master | [Data Table](https://ui.shadcn.com/docs/components/base/data-table) com a tabela do registro shadcn/ui e TanStack Table. |
| Master expandido | Card, SectionCards e SiteHeader portados do Dashboard 01 oficial do shadcn; títulos com Words Stagger do Spell; gráfico original Chart do Spell com histórico ilustrativo apenas no servidor temporário. |
| Campos e rateio | Label Input original do Spell; Combobox Base UI do shadcn para filtros, seleção de responsável e múltiplos moradores; Calendar do shadcn no Date Picker. Labels e ícones foram localizados e associados aos controles. |
| Tarefas da república | Animated Checkbox original do Spell com controle semântico e Animated List original do registro público Unlumen, com preferências de movimento reduzido e sem truncar a lista. |

A home usa valores ilustrativos identificados no cartão de apresentação. O painel autenticado faz chamadas à API do RepHouse. Para revisão sem backend, `npm run preview:prototipo` em `interface/` serve a mesma interface com uma API local isolada e dados fictícios em memória. Consulte [como executar](../../interface/README.md). A integração completa com o backend real ainda não foi validada. As referências da curadoria que ainda não entraram nessa entrega permanecem em [favoritos provisórios](favoritos-provisorios.md).

Animated Number Input do Skiper 68 e Animated Input do Unlumen exigem acesso Pro. Não foram incorporados. O Label Input do Spell já escolhido cobre os campos enquanto os fontes Pro não estão disponíveis. O histórico do gráfico existe somente nas fixtures locais e é identificado como ilustrativo.
