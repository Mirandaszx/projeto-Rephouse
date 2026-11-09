# Direções em exploração

Propostas de design, ainda não selecionadas. São descrições autorais, não capturas do Figma, modelos finalizados ou afirmações de contraste/acessibilidade já medidos.

## A. Casa aberta — convivência organizada

Recomendação inicial: prioriza a compreensão das obrigações de cada pessoa e a personalidade da república.

- Paleta candidata: fundo `#F7F8FA`, superfície `#FFFFFF`, texto `#173D3B`, ação verde `#167463`, navegação azul `#2F5FA8`, destaque quente `#D98A43`.
- Manrope como família única; números tabulares para valores; pesos e escalas contidos.
- Desktop: navegação lateral, contexto da casa permanente e uma área principal de pendências/despesas. Tarefas e atividade são complementos apenas quando o backend fornecer os dados.
- Hierarquia do morador: saldo/obrigação própria, próximo vencimento, ação correspondente e lista de despesas. Administrador e MASTER recebem visões próprias, sem seletor de papel artificial.
- Evitar transformar toda informação em um card. Priorizar listas claras e superfícies agrupadas por tarefa.
- No celular, reorganizar por prioridade sem reduzir uma tabela inteira até ficar ilegível; detalhes e formulários recebem espaço adequado.
- Movimento: resposta a ações, abertura de detalhes e atualização de status. Sem dinheiro contando na entrada ou fundos competindo com a leitura.
- Tradeoff: acolhedor e reconhecível; exige disciplina de densidade para servir também ao administrador.

## B. Livro da casa — consulta e gestão direta

Alternativa com mais densidade de informação para administração frequente.

- Paleta candidata: fundo `#F2F5F7`, superfície `#FFFFFF`, texto `#172B3A`, ação azul `#245DB5`, confirmação verde `#187B64`, atenção `#C98B2C`.
- Inter como família única; números tabulares e pesos 400/500/600.
- Desktop: resumo financeiro compacto, despesas organizadas por vencimento e detalhe lateral, preservando a posição da lista.
- Tarefas ficam separadas do fechamento financeiro; filtros explícitos e contexto da casa visível.
- No celular, despesas viram uma lista com valor, vencimento e situação; filtros e detalhes são abertos sob demanda.
- Movimento restrito a seleção, filtros e feedback de operação.
- Tradeoff: eficiente para conferência; pode parecer administrativo demais para uso ocasional.

## Decisões que não dependem da escolha

- Sistema próprio, com componentes externos adaptados aos mesmos tokens.
- Estados de carregamento, vazio, erro, sessão expirada e permissão tratados de forma consistente.
- Nenhum fluxo de cobrança da assinatura nesta versão.
- Não acrescentar aprovação de comprovante, reabertura de tarefa por morador ou transferência bancária por semelhança com referências.
- Contraste, teclado, movimento reduzido e layout responsivo precisam de verificação na implementação.

## Próximo artefato

Uma comparação visual das duas composições com o mesmo conteúdo de dashboard, no Figma se as ferramentas conectadas permitirem. Após seleção, registrar o design com decisões suficientes para implementar. Não registrar uma recomendação como aprovação do usuário.
