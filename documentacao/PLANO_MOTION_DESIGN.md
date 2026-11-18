# Motion design do RepHouse

Proposta de 18/11/2026, após a validação dos refinamentos da interface. A direção é uma experiência fluida e discreta: o movimento explica uma mudança ou confirma uma ação, enquanto valores e informações permanecem fáceis de ler.

**Primeira etapa implementada: modais e avisos.** As sugestões 3 e 4 continuam propostas, sem implementação. O usuário aprovou entrada de 180 ms, saída de 140 ms e resposta imediata para teclado e movimento reduzido nesta etapa. Bibliotecas adicionais estão autorizadas se houver necessidade concreta; estes efeitos foram atendidos por CSS e pelo ciclo de vida dos componentes existentes, sem instalação. Detalhes e validação: [Motion — primeira etapa](MOTION_PRIMEIRA_ETAPA.md).

## Inventário na análise inicial

| Área | Implementação à época da análise | Decisão |
| --- | --- | --- |
| Páginas internas | Entrada de 200 ms, opacidade e deslocamento de 8 px; teclado e movimento reduzido dispensam o efeito. `interno/WorkspacePage.tsx:16` e `useWorkspaceNavigation.ts`. | Manter. Não somar animações de cada indicador ou linha à entrada da página. |
| Filtros | Indicador deslizante e feedback de resultados de 160 ms. Existe exceção aprovada para o deslize de 350 ms por clique, mesmo com movimento reduzido. `interno/workspace.css` e `useWorkspaceTransition.ts:36`. | Preservar a escolha do usuário e a resposta imediata por teclado. Não aumentar a duração. |
| Conclusão de tarefa | Desenho do check e risco do título em 160 ms. `novo/SpellTaskCheckbox.tsx`. | Já cumpre a função. Não acrescentar comemoração a cada tarefa. |
| Botões, calendário e seletor | Pressão de botão em torno de 140 ms e popovers em 150 ms. `interno/workspace.css:400`. | Reutilizar, com foco imediato e origem ligada ao controle. |
| Copiar convite | Mudança de ícone e mensagem de confirmação. `novo/CopyInvite.tsx` e `rebuild/vendor/spell-copy-button.tsx`. | Manter o feedback; não duplicar com outro efeito ou modal. |
| Home e acesso | Hero com BlurReveal, gradiente pausável, prévia com TiltCard e entrada discreta do formulário. | Já há movimento suficiente. Não adicionar novas entradas em todas as seções. |

A inspeção separou componentes realmente utilizados de código de demonstração ou legado. A presença de `UnlumenTaskList.tsx`, por exemplo, não significa que a lista operacional de tarefas o utiliza. A sensação exata de cada receita abaixo ainda precisa ser comparada no navegador; uma duração definida no código não é aprovação visual.

## Onde vale acrescentar ou completar movimento

A curva de saída rápida segue o vocabulário já utilizado: `cubic-bezier(0.23, 1, 0.32, 1)`. As sugestões usam somente `transform` e `opacity`, sem animar altura de listas, valores ou posicionamento da navegação.

| Ordem | Local e situação observada no planejamento | Finalidade | Frequência | Receita proposta |
| --- | --- | --- | --- | --- |
| 1 | **Fechamento dos diálogos.** A entrada já existe em 180 ms; `gestao/ActionDialog.tsx:33` e o diálogo de `novo/Republica.tsx` fecham imediatamente. | Manter continuidade espacial no encerramento de uma ação. | Ocasional. | Preservar entrada de 180 ms; saída de **140 ms**, opacidade 1 → 0 e `translateY(0)` → `translateY(4px)`, curva de saída rápida. Backdrop acompanha apenas a opacidade. Escape/teclado fecha imediatamente. |
| 2 | **Saída dos avisos de sucesso.** `novo/Republica.tsx:275` remove o aviso diretamente. `novo/motion.css` já prevê estados de saída, mas o fechamento não os utiliza. | Confirmar a ação sem uma remoção abrupta. | Ocasional; eventos repetidos precisam ser interrompíveis. | Entrada de **180 ms** e saída de **140 ms**, opacidade e deslocamento vertical de no máximo **8 px**, mesma curva. Reutilizar uma única transição, sem empilhar avisos duplicados. |
| 3 | **Conteúdo de “Contas recorrentes”.** `gestao/RecurringExpenses.tsx:68` expande um `details` instantaneamente. | Tornar legível a passagem de resumo para configuração detalhada. | Ocasional, sobretudo mensal. | Ao abrir por ponteiro, conteúdo de opacidade 0 → 1 e `translateY(4px)` → 0 em **160 ms**, curva de saída rápida. Manter altura e rolagem naturais; não animar cada recorrência separadamente. O aviso de revisão permanece visível fora da área recolhida. |
| 4 | **Passagem da primeira despesa para o painel preenchido.** A orientação inicial de `novo/Overview.tsx` é substituída após a operação. | Evitar troca abrupta em um primeiro uso importante. | Rara: primeira despesa da casa. | Depois da confirmação real da API, uma única entrada do novo bloco em **180 ms**, opacidade 0 → 1 e deslocamento máximo de **4 px**, mesma curva. Sem contagem animada dos valores e sem repetir em cada consulta ou lançamento. |

Todos os candidatos passaram pelos quatro critérios: frequência compatível, finalidade identificada, duração curta e preservação da função. O primeiro item tem maior impacto porque completa um comportamento já visível em vários formulários.

## O que ficaria exagerado

| Candidato descartado | Motivo |
| --- | --- |
| Dinheiro contando de zero, números rolando ou saldo pulsando | Reprovado por função: são dados que a pessoa precisa conferir imediatamente, inclusive após pagamentos parciais. |
| Todas as linhas entrando em cascata em cada filtro, busca ou troca de página | Reprovado por frequência: repete-se durante o trabalho e atrasa a leitura. Preservar a transição única e discreta já existente. |
| Casinha flutuando continuamente, ícones pulando e cards seguindo o mouse nas telas internas | Reprovado por finalidade e função: decoração sem resposta útil para a operação. A casinha permanece parte da identidade do acesso. |
| Confete e comemoração em pagamento, exclusão ou bloqueio | Reprovado por função e tom: registrar pagamento não transfere dinheiro; ações destrutivas pedem clareza, não celebração. |
| Navegação lenta, tela inteira deslizando e animação em foco de teclado | Reprovado por frequência e acessibilidade. Não atrasar navegação, foco, Escape ou atalhos. |

## Regras da implementação futura

- Aproveitar React, Motion, CSS, Glisse e Base UI existentes. Bibliotecas adicionais podem ser instaladas se resolverem uma limitação concreta, evitando duplicar recursos.
- Começar por diálogos e avisos; depois testar a abertura das recorrências. O primeiro lançamento é opcional e fica por último, pois acontece raramente.
- Não bloquear a requisição esperando uma animação. Aguardar a resposta da API antes de apresentar sucesso e preservar o bloqueio contra envio duplicado.
- Em fechamento por ponteiro, manter o diálogo montado e modal durante a saída, com trava contra nova submissão. Encerrar no evento de término, com limite de tempo para não prender a interface, e devolver o foco ao acionador. Teclado e Escape seguem imediatos.
- Interromper/retomar a partir do estado atual em cliques rápidos. Um aviso novo não pode ser removido por um temporizador pertencente ao aviso anterior.
- Na primeira etapa aprovada, teclado e movimento reduzido têm resposta imediata. A exceção de 350 ms do filtro continua restrita ao clique que o usuário aprovou.
- Erros ficam estáveis e próximos ao campo. Não tremer formulário nem esconder mensagem por tempo. Carregamento representa trabalho real; sem espera artificial.
- Não adicionar animação de hover no celular. Quando necessária no computador, restringir a `(hover: hover) and (pointer: fine)`.

## Como validar antes de concluir

1. Comparar com e sem cada efeito em 320, 390, 768 e 1440 px, com mouse, toque simulado e teclado, nos temas claro e escuro.
2. Conferir cliques rápidos, abertura/fechamento repetidos, Escape, restauração de foco e mudança de preferência de movimento durante o efeito.
3. Usar respostas lentas e falhas controladas: sem sucesso antecipado, submissões duplicadas, avisos antigos removendo os novos ou conteúdo preso transparente.
4. Confirmar que saldos, parcelas e datas continuam imóveis e legíveis; verificar também zoom de 200% e acesso aos controles com a navegação inferior fixa.
5. Inspecionar o desempenho no navegador, sem prometer fluidez apenas pelo uso de Motion. Não animar `height`, `width`, margens ou blur dos dados operacionais.
6. Executar a suíte ativa e verificar os quadros intermediários relevantes. Registrar separadamente observação visual e verificações automatizadas; uma não substitui a outra.

O RepHouse precisa de poucos efeitos bem conectados às ações. **A recomendação é começar pela saída dos diálogos e dos avisos**, preservando o movimento que já funciona. Cada receita pode virar uma tarefa de implementação isolada; este documento não autoriza alterar regras financeiras, APIs ou a identidade visual.
