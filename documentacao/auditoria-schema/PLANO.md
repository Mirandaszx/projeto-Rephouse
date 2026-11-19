# Plano aprovado de correções do schema

Este documento registra o plano apresentado antes das mudanças e aprovado pelo usuário, incluindo M09. Na auditoria inicial não foram criadas migrations: as consultas foram executadas somente no desenvolvimento local, com transação `READ ONLY`. A implementação posterior está descrita em [IMPLEMENTACAO.md](IMPLEMENTACAO.md) e foi validada exclusivamente no banco dedicado de testes. Não aplicar esta proposta em produção.

## Base para a decisão

O [dicionário completo](DICIONARIO.md) lista cada tabela/coluna/tipo e as 24 FKs existentes. [CONTAGENS.md](CONTAGENS.md) mostra as 36 contagens individuais, com **zero violações em cada uma**, além dos diagnósticos financeiros e de referências. O SQL reproduzível está em [consultas.sql](consultas.sql).

São seis registros de aplicação em seis tabelas; oito tabelas estão vazias. Antes de aplicar qualquer mudança, repetir o preflight no destino autorizado. Zero numa tabela vazia não prova o funcionamento da futura constraint.

O escopo inicial recomendado é **M01–M08**. M09 fica separado para as garantias de transição. Os IDs Cxx são referências a consultas já executadas, não nomes de migrations existentes.

## Uma migration por assunto, com retorno definido

| Assunto proposto | Ida, após aprovação | Contagem já executada | Volta prevista |
| --- | --- | --- | --- |
| M01 — textos e tamanho | Adicionar CHECKs de conteúdo não vazio após trim equivalente ao JavaScript; limitar descrição a 5000 e demais textos aos máximos atuais em unidades UTF-16. Preservar NULLs opcionais e os CHECKs/tipos já instalados. | C01–C08 e C29–C36: **0 em cada regra** | Remover somente os novos CHECKs. Não mudar conteúdo, tamanho de coluna ou os CHECKs antigos. |
| M02 — formato de e-mail | Adicionar CHECK com a expressão da versão instalada de `z.email()`, congelada e testada no PostgreSQL; manter normalização e unicidade existentes. | C28: **0** | Remover somente o novo CHECK; manter e-mails e índice único. |
| M03 — números financeiros finitos | Adicionar CHECK que exclui NaN das cinco colunas monetárias; preservar `numeric(12,2)`, positivos, limites de saldo e agregações. | C13–C17: **0 em cada coluna** | Remover somente os novos CHECKs, preservando as regras financeiras anteriores. |
| M04 — versões de autenticação | Exigir `usuarios.versao_token >= 0` e, condicionalmente, versão explicitamente não nula/não negativa nos desafios de exclusão. Acrescentar a proteção sem retirar o CHECK atual de finalidade. | C09/C10: **0 em cada regra** | Remover os dois novos CHECKs; manter as regras anteriores e não reabrir desafios consumidos. |
| M05 — hashes de requisição | Validar SHA-256 hexadecimal minúsculo em pagamentos e recorrências. Manter `pagamentos.hash_requisicao` opcional para históricos legados. | C11/C12: **0 em cada tabela** | Remover os CHECKs novos; não alterar hashes nem chaves. |
| M06 — metadados de recorrência | Exigir versão positiva, pares de revisão completos e motivos limitados aos emitidos hoje pelo gerador. Revisão mantém seu motivo original; não exigir que participantes históricos continuem ativos. | C18/C25/C26/C27: **0 em cada regra** | Remover somente os quatro CHECKs novos; preservar configurações, snapshots e revisões. |
| M07 — datas civis finitas | Aplicar `isfinite()` às seis colunas DATE; prazo opcional continua aceitando NULL. Não exigir data futura nem impor `CURRENT_DATE` a históricos. | C19–C24: **0 em cada coluna** | Remover somente os novos CHECKs; tipos DATE e todos os valores permanecem. |
| M08 — view no horário de Brasília | Padronizar o fuso explícito de `America/Fortaleza` para `America/Sao_Paulo`, mantendo as mesmas colunas/valores públicos e sem atualizar despesas. Correção do diagnóstico inicial: a definição capturada já não usa `CURRENT_DATE`. | D18: **0 divergências agora**; o exemplo UTC/Brasília demonstra calendário, não um defeito atual da view | Restaurar exatamente a definição anterior da view, capturada no catálogo em `resultado.json`. Não alterar linhas. |

Cada migration será SQL adicional, sem editar as dez migrations aplicadas. Os CHECKs customizados precisam ser documentados porque o modelo Prisma não representa todas essas garantias. Não acrescentar NOT NULL global a campos opcionais como senha Google, prazo, endereço ou dados de revisão.

O tamanho UTF-16 será uma expressão por linha, equivalente à usada no preflight: quantidade de pontos de código mais quantidade de caracteres fora do plano básico Unicode. O trim usará o conjunto de espaços do ECMAScript, explicitado nas consultas. Não criar uma restrição de letras ASCII para nomes e títulos. O formato de e-mail é uma política diferente, já adotada por `z.email()` no backend.

CHECKs novos poderão usar a sequência de adição `NOT VALID` e validação, com limites curtos de espera por locks e validação obrigatória ao concluir. Uma falha de contagem/validação interromperá a mudança, sem modificar dados. A definição de sucesso exige não deixar constraints pendentes de validação. [Referência PostgreSQL 18](https://www.postgresql.org/docs/18/sql-altertable.html).

## M09 — garantias de transição, em migration separada

Os seguintes comportamentos já existem na API, mas precisam de tratamento próprio para escritas SQL diretas:

- Impedir que uma conta com `excluido_em` já preenchido volte a ficar disponível ou tenha sua exclusão desfeita.
- Impedir remover, bloquear, excluir ou retirar o perfil do último MASTER ativo quando ele já existe, preservando transferências válidas dentro da mesma transação.

Proposta: triggers novas, com serialização compatível com a administração existente e validação do estado final quando necessário. Usar códigos estruturados para erros. Não transformar a segunda regra num CHECK global que obriga existir MASTER na primeira conta cadastrada.

Contagens contextuais executadas: **D16 = 0 MASTER ativos; D17 = 0 contas atualmente excluídas**. A base permite começar sem MASTER, portanto D16 não é uma inconsistência a corrigir automaticamente. Também não existe trilha para contar reativações passadas. Esses números não serão apresentados como prova de ausência de violações históricas.

Antes de criar M09, confirmar o desenho do evento e provar em base de testes: exclusão irreversível, início sem MASTER, criação do primeiro MASTER, bloqueios concorrentes e substituição do último MASTER na mesma transação. A volta removerá somente os novos triggers/funções; não reativará contas nem alterará usuários. Não provisionar MASTER nesta auditoria.

## Recuperação e validação

Após a aprovação do plano:

1. Preparar dados válidos, legados e inválidos em schema exclusivo do PostgreSQL de testes na porta 5544. Não aplicar migrations no banco da equipe para validar.
2. Escrever `migration.sql` de ida e `down.sql` correspondente por assunto. Ambos serão revisados; nenhum deles terá UPDATE/DELETE de registros de negócio.
3. Para cada regra, tentar a escrita inválida por SQL real, comprovar rejeição e rollback, e testar os limites válidos por SQL e HTTP.
4. Executar cada ida/volta/ida em ambiente descartável, comparando linhas, relações, hashes de comprovantes e definições preservadas. As migrations aplicadas anteriormente permanecem intactas.
5. Executar `npm run test:completo`. Separar falhas novas dos três bugs de produto já registrados; não apagar, ignorar ou enfraquecer testes para aprovar o schema.
6. Atualizar dicionário, catálogo e resultados. A conclusão exige ausência de violações e constraints validadas, com qualquer bloqueio registrado individualmente.

`down.sql` não é restauração de dados. Para uma migration já concluída, a reversão deve ser registrada por uma migration compensatória no histórico, mantendo a ida original. SQL customizado de CHECKs, views e triggers exige revisão manual da volta; não confiar somente no diff do Prisma. `migrate resolve` não executa o SQL de reversão e não deve ser usado para fingir rollback de uma migration bem-sucedida. [Orientação oficial do Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/generating-down-migrations).

Se aparecer uma violação durante o preflight, informar regra/quantidade e suspender aquele assunto. Discutir com o responsável o valor correto ou uma exceção explícita para legado, sem decidir pelo usuário. Não truncar texto, converter IDs, preencher hashes artificialmente, fundir contas ou eliminar registros para passar.

## Fora desta primeira alteração

- Não adicionar FKs simples: as 24 referências identificadas já estão declaradas e não há órfãos.
- Não desmontar snapshots, agregados financeiros ou campos legados que preservam histórico.
- Não usar UNIQUE em título/valor/data para resolver reenvios. A idempotência de despesas e tarefas precisa primeiro registrar uma identidade de operação; não é possível contar duplicações retrospectivas usando o schema atual.
- Não tentar resolver o HTTP 500 de `"1,00"` com uma constraint: a conversão/validação da entrada deve ser corrigida no backend. O formato original já não está disponível depois de uma conversão numérica.
- Não substituir autenticação e autorização da API por FKs. RLS e separação da role superusuária de migrations da role da aplicação precisam de revisão de permissões separada.
- Não atualizar dados, executar reset, apagar volumes, fazer commit/push ou executar qualquer ação em produção.
