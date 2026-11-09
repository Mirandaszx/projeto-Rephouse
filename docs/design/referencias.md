# Curadoria de referências

Pesquisa documental em 30/10/2026. Os links abaixo são candidatos, não dependências instaladas nem componentes aprovados. Disponibilidade, preço e termos podem mudar. Não houve ensaio de integração desses componentes com React 19/Tailwind 4 nem auditoria interativa de acessibilidade nesta etapa.

## Componentes com relação direta com o produto

| Fonte | Uso candidato | Adaptação e limite |
|---|---|---|
| [Cult Halo Dropzone](https://www.cult-ui.com/docs/components/halo-dropzone) | Anexar comprovante no registro de pagamento. | React/shadcn/Motion. Preservar seletor de arquivo e validação do servidor; UI de upload não fornece armazenamento. |
| [Cult Family Drawer](https://www.cult-ui.com/docs/components/family-drawer) | Painéis de ações curtas no celular. | Vaul/Motion. Formulários longos podem exigir página própria; compatibilidade precisa ser ensaiada. |
| [Spell Fallback Avatar](https://spell.sh/docs/fallback-avatar) | Identificação de moradores por nome sem depender de upload de foto. | Desligar animação contínua em listas; manter nome visível. Conferir dependências do código selecionado. |
| [Uiverse Animated Task Checkbox](https://uiverse.io/MattiaCode-IT/wise-elephant-53) | Feedback de conclusão de tarefa. | HTML/CSS exige adaptação a React controlado, teclado e movimento reduzido; só permitir ações autorizadas pela API. |
| [unlumen Sidebar 001](https://ui.unlumen.com/components/sidebar-001) | Hierarquia de navegação desktop. | Exemplo usa Motion, lucide e next/navigation; adaptar roteamento para Vite. Exige comportamento responsivo próprio. |
| [unlumen Motion FAQs Accordion](https://ui.unlumen.com/components/motion-faqs-accordion) | Dúvidas reais na eventual página pública. | Tailwind/Motion; conferir tokens e necessidade da superfície antes de incorporar. |

## Origem e termos a preservar no código incorporado

- Cult: [repositório oficial](https://github.com/nolly-studio/cult-ui) apresenta licença MIT. Preservar avisos aplicáveis do código efetivamente utilizado.
- Spell: [licença do repositório](https://github.com/xxtomm/spell-ui/blob/main/LICENSE).
- Uiverse: a página do candidato apresenta MIT; registrar origem e autor ao incorporar.
- unlumen: os [termos publicados](https://unlumen-ui-docs.vercel.app/docs/license) restringem redistribuição como biblioteca. O uso no app deve ser conferido para o item escolhido; não tratar como MIT por estar marcado Free.
- Skiper: o [quick start](https://skiper-ui.com/docs/quick-start) diferencia Free/Pro e informa atribuição no Free; conferir antes de copiar.
- Originkit: [licenciamento](https://www.originkit.dev/docs/licensing) e [planos](https://www.originkit.dev/docs/account-billing) não equivalem a um catálogo integralmente gratuito.

## Inspiração e composição

- [Inspora](https://www.inspora.design/): referências separadas por Product/Web/Motion; buscar composição de app e hierarquia.
- [Refero Styles](https://styles.refero.design/): analisar tipo, cores, espaçamento e consistência de sistemas reais; construir tokens próprios.
- [Splitwise](https://www.splitwise.com/): clareza de grupos, despesas e saldos; limites funcionais continuam sendo os do RepHouse.
- [GetLayers](https://www.getlayers.ai/) e [MotionSites](https://motionsites.ai/): candidatos para uma eventual superfície de apresentação, quando houver motivo para cena, hero ou fundo. Não transportá-los automaticamente para tabelas financeiras.

## Catálogos complementares fornecidos pelo usuário

- [Spell](https://spell.sh/)
- [Skiper UI](https://skiper-ui.com/)
- [Uiverse](https://uiverse.io/)
- [21st — comunidade](https://21st.dev/community/components)
- [21st — Expandable Tabs](https://21st.dev/@rjcuff2000/components/expandable-tabs): candidato de interação; a página consultada pede conta gratuita para a fonte. Manter rótulos de navegação legíveis.
- [unlumen](https://ui.unlumen.com/components)
- [Originkit](https://www.originkit.dev/)
- [Cult UI](https://www.cult-ui.com/)

## Motion e verificação

- [Motion para React](https://motion.dev/docs/react): candidato para gestos, presença e transições de estado. Ainda não instalado por esta pesquisa.
- [GSAP](https://gsap.com/docs/v3/): candidato quando existir uma necessidade concreta de timeline/scroll; não adotar dois motores de animação por padrão.
- [Playwright](https://playwright.dev/docs/intro): automação local para navegador e evidência de desktop/celular; não produz layouts nem substitui decisões de design.

## Critério de seleção

Incorporar um componente somente quando ele resolver uma tarefa real, puder seguir os tokens escolhidos, funcionar com teclado/touch e não introduzir fluxos ausentes no backend. Registrar fonte, alterações, dependências e avisos de licença junto ao código incorporado. Esta curadoria não afirma que todos os candidatos passaram nesses critérios.
