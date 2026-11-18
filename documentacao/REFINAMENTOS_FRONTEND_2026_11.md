# Refinamentos do frontend — 18/11/2026

A revisão da Impeccable foi aplicada como refinamento da interface existente. A identidade verde, a fonte Inter, a casinha, a navegação da casa e o cabeçalho independente da conta foram preservados.

## O que mudou

- No celular, título e vencimento das pendências usam a largura inteira. Valor e ação ficam abaixo e podem quebrar em linhas separadas quando necessário. Nomes extensos não provocam rolagem horizontal.
- Os registros apresentados em “Minhas pendências” não são repetidos em “Despesas recentes”. O acesso à coleção completa continua disponível.
- A operação manual passou a se chamar “Registrar pagamento” nos botões e formulários. A ajuda explica que o RepHouse registra pagamentos feitos pelo meio combinado com a casa e não transfere dinheiro.
- A criação e a edição permitida de despesas e recorrências apresentam uma conferência com nomes e valores por pessoa, dentro do formulário.
- A conferência usa centavos inteiros e a mesma distribuição do restante por IDs usada no backend. O banco continua sendo a autoridade ao salvar. Alterar valor ou seleção atualiza a prévia; uma quantia insuficiente para distribuir ao menos um centavo por pessoa mostra orientação.
- “Mês do vencimento” substitui “Competência” nos filtros visíveis. Os cinco estados continuam disponíveis; setas e uma instrução aparecem quando os filtros precisam de rolagem local.
- Recorrências pausadas e meses pendentes de revisão são sinalizados mesmo com a seção recolhida. Os meses são consultados pelas APIs existentes, com no máximo quatro consultas simultâneas e erros visíveis, sem concluir que tudo está em dia quando uma consulta falha.
- Textos auxiliares da home e da autenticação ganharam tamanho e contraste. As prévias ilustrativas mantêm uma superfície clara legível nos dois temas. O placeholder da busca MASTER usa a cor de texto secundário do tema.

## Conferência

O cenário HTTP com PostgreSQL dedicado compara os valores mostrados na interface com os rateios persistidos para R$ 100,00 entre três moradores: R$ 33,34, R$ 33,33 e R$ 33,33. Também verifica mudança de seleção, valor insuficiente e limpeza da prévia ao abrir outro cadastro.

As verificações de layout incluem 320, 390, 768, 1024 e 1440 px nos dois temas, conteúdo extremo, teclado e a regressão já existente. A home foi conferida em 320, 390, 768 e 1440 px. O login normal também é verificado em 1366 × 768 sem rolagem vertical desnecessária.

As capturas de demonstração real usam apenas contas fictícias e ficam em `.devops-local/interface/imagens/impeccable-polimento-real/`. As capturas controladas da suíte ficam em `.devops-local/interface/imagens/impeccable-polimento/`. Esses diretórios permanecem fora do versionamento. Resultados desta etapa: `evidencias/validacao-polimento-frontend.json`.

O detector de código manteve somente dois avisos sobre Inter. Eles são exceções deliberadas, pois a fonte faz parte da identidade aprovada. Os testes e a inspeção visual não equivalem a certificação de acessibilidade nem a teste em celular físico ou leitor de tela.

## Limites preservados

Não houve alteração de API, tipos públicos, regra financeira, versão 2.2.0 ou migration nesta etapa. O banco da equipe não foi atualizado; os testes usam um schema descartável no PostgreSQL dedicado. O provisionamento adicional de contas ocorre apenas no harness dos testes.

Recuperação de senha foi identificada na revisão como funcionalidade futura. Ela exige um fluxo real no backend e não foi substituída por um link sem implementação ou por uma instrução de suporte inexistente.

O planejamento de motion design é uma proposta separada em `PLANO_MOTION_DESIGN.md`; os efeitos propostos ali não fazem parte destas correções. Sem commit, push ou publicação.
