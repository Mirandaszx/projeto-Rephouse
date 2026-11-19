# Contagens antes das propostas

Executadas em 2026-11-18T22:50:58.159Z, na mesma transação `REPEATABLE READ READ ONLY`, banco local `rabbu_mvp`. Nenhuma migration, alteração ou limpeza foi executada. As 10 migrations aplicadas conferem com os checksums locais: **sim**.

[Consultas exatas](consultas.sql) · [Resultado estruturado](resultado.json) · [Plano sujeito à aprovação](PLANO.md).

Cada Cxx abaixo tem um SELECT COUNT executado antes da proposta correspondente. Zero significa ausência de violações nesta fotografia; há 8 tabelas da aplicação vazias. Não é prova de que as regras já estão instaladas.

| ID | Tabela | Regra avaliada | Linhas em violação | Fonte no código |
| --- | --- | --- | --- | --- |
| C01 | `usuarios` | nome: ao menos um caractere após o trim ECMAScript | **0** | validation.ts: name; Auth.tsx/Profile.tsx |
| C02 | `republicas` | nome: ao menos um caractere após o trim ECMAScript | **0** | republicas.controller.ts: name; HouseSettings.tsx |
| C03 | `despesas` | titulo: ao menos um caractere após o trim ECMAScript | **0** | financeiro.controller.ts: trim/min(1); Republica.tsx |
| C04 | `despesas` | categoria: ao menos um caractere após o trim ECMAScript | **0** | financeiro.controller.ts: trim/min(1); ExpenseDetails.tsx |
| C05 | `tarefas` | titulo: ao menos um caractere após o trim ECMAScript | **0** | tarefas.controller.ts: trim/min(1); novo/Tasks.tsx |
| C06 | `configuracoes_recorrencia` | titulo: ao menos um caractere após o trim ECMAScript | **0** | recorrencias.routes.ts: trim/min(1); RecurringExpenses.tsx |
| C07 | `configuracoes_recorrencia` | categoria: ao menos um caractere após o trim ECMAScript | **0** | recorrencias.routes.ts: trim/min(1); RecurringExpenses.tsx |
| C08 | `tarefas` | descricao: até 5000 unidades UTF-16, mantendo NULL permitido | **0** | tarefas.controller.ts; novo/Tasks.tsx maxLength=5000 |
| C09 | `usuarios` | versao_token não negativa | **0** | auth.service.ts: JWT ver inteiro não negativo |
| C10 | `desafios_google` | finalidade exclusao exige versao_token explicitamente não nula e não negativa | **0** | google.service.ts: actor.versaoToken; CHECK atual pode resultar em NULL |
| C11 | `pagamentos` | hash_requisicao: NULL legado ou SHA-256 hexadecimal minúsculo | **0** | financeiro.service.ts: createHash; históricos continuam opcionais |
| C12 | `recorrencias_despesa` | hash_requisicao: SHA-256 hexadecimal minúsculo | **0** | recorrencias.service.ts: createHash |
| C13 | `despesas` | valor_total: número finito, sem NaN | **0** | money/rateio: valor decimal finito; numeric permite NaN |
| C14 | `rateios_despesa` | valor_devido: número finito, sem NaN | **0** | money/rateio: valor decimal finito; numeric permite NaN |
| C15 | `rateios_despesa` | valor_pago: número finito, sem NaN | **0** | money/rateio: valor decimal finito; numeric permite NaN |
| C16 | `pagamentos` | valor: número finito, sem NaN | **0** | money/rateio: valor decimal finito; numeric permite NaN |
| C17 | `configuracoes_recorrencia` | valor_total: número finito, sem NaN | **0** | money/rateio: valor decimal finito; numeric permite NaN |
| C18 | `configuracoes_recorrencia` | versao positiva | **0** | recorrencias.repository.ts: sequência de versões de configuração |
| C19 | `despesas` | vencimento: data finita, preservando a nulabilidade atual | **0** | dateOnly/competenciaSchema: datas civis finitas |
| C20 | `tarefas` | prazo: data finita, preservando a nulabilidade atual | **0** | dateOnly/competenciaSchema: datas civis finitas |
| C21 | `recorrencias_despesa` | inicio: data finita, preservando a nulabilidade atual | **0** | dateOnly/competenciaSchema: datas civis finitas |
| C22 | `recorrencias_despesa` | proxima_competencia: data finita, preservando a nulabilidade atual | **0** | dateOnly/competenciaSchema: datas civis finitas |
| C23 | `configuracoes_recorrencia` | vigencia: data finita, preservando a nulabilidade atual | **0** | dateOnly/competenciaSchema: datas civis finitas |
| C24 | `competencias_recorrencia` | competencia: data finita, preservando a nulabilidade atual | **0** | dateOnly/competenciaSchema: datas civis finitas |
| C25 | `competencias_recorrencia` | revisada_em e revisada_por_id preenchidos ou ausentes juntos | **0** | recorrencias.service.ts: review grava os dois campos juntos |
| C26 | `recorrencias_despesa` | pausa_motivo limitado aos motivos emitidos pelo gerador | **0** | recorrencias.service.ts: materializeRecurring |
| C27 | `competencias_recorrencia` | motivo limitado aos motivos emitidos pelo gerador, inclusive após revisão | **0** | recorrencias.service.ts: materializeRecurring/review |
| C28 | `usuarios` | email compatível com a expressão de z.email() instalada | **0** | validation.ts / google.verifier.ts: Zod; regex congelada nesta auditoria, sem alegação de RFC completo |
| C29 | `usuarios` | nome: até 120 unidades UTF-16, sem restringir acentos | **0** | Zod max()/maxlength HTML; varchar limita pontos de código, não UTF-16 |
| C30 | `republicas` | nome: até 120 unidades UTF-16, sem restringir acentos | **0** | Zod max()/maxlength HTML; varchar limita pontos de código, não UTF-16 |
| C31 | `despesas` | titulo: até 160 unidades UTF-16, sem restringir acentos | **0** | Zod max()/maxlength HTML; varchar limita pontos de código, não UTF-16 |
| C32 | `despesas` | categoria: até 80 unidades UTF-16, sem restringir acentos | **0** | Zod max()/maxlength HTML; varchar limita pontos de código, não UTF-16 |
| C33 | `tarefas` | titulo: até 160 unidades UTF-16, sem restringir acentos | **0** | Zod max()/maxlength HTML; varchar limita pontos de código, não UTF-16 |
| C34 | `configuracoes_recorrencia` | titulo: até 160 unidades UTF-16, sem restringir acentos | **0** | Zod max()/maxlength HTML; varchar limita pontos de código, não UTF-16 |
| C35 | `configuracoes_recorrencia` | categoria: até 80 unidades UTF-16, sem restringir acentos | **0** | Zod max()/maxlength HTML; varchar limita pontos de código, não UTF-16 |
| C36 | `republicas` | endereco: até 255 unidades UTF-16, sem restringir acentos | **0** | Zod max()/maxlength HTML; varchar limita pontos de código, não UTF-16 |

## Regras e estados adicionais

| ID | Verificação | Resultado | Natureza |
| --- | --- | --- | --- |
| D01 | rateios de outra república | **0** | Violações do estado atual |
| D02 | pagamento de membro diferente do rateio | **0** | Violações do estado atual |
| D03 | tarefa e responsável de repúblicas diferentes | **0** | Violações do estado atual |
| D04 | despesa sem rateios, soma divergente ou divisão desigual | **0** | Violações do estado atual |
| D05 | valor_pago divergente da soma dos pagamentos | **0** | Violações do estado atual |
| D06 | status da despesa divergente das parcelas | **0** | Violações do estado atual |
| D07 | usuário com mais de um vínculo ativo (linhas excedentes) | **0** | Violações do estado atual |
| D08 | conta sem senha e sem identidade Google | **0** | Violações do estado atual |
| D09 | administrador sem perfil ou vínculo coerente (ativo da conta não é exigido aqui) | **0** | Violações do estado atual |
| D10 | excluído com dívida, administração ou vínculo ativo | **0** | Violações do estado atual |
| D11 | configuração recorrente sem participantes ou sem um centavo por participante | **0** | Violações do estado atual |
| D12 | participante recorrente de outra república (inatividade histórica é permitida) | **0** | Violações do estado atual |
| D13 | comprovante com tamanho, hash ou MIME incoerente | **0** | Violações do estado atual |
| D14 | pagamento legado sem hash (não é violação: preservar NULL) | **0** | Quantidade contextual; não é violação |
| D15 | referência legada de comprovante sem conteúdo importado | **0** | Quantidade contextual; não é violação |
| D16 | MASTER ativos (zero não é violação do fluxo inicial; regra de último MASTER é transicional) | **0** | Quantidade contextual; não é violação |
| D17 | contas atualmente excluídas (não revela reativações passadas) | **0** | Quantidade contextual; não é violação |
| D18 | view de vencimento divergente da data de Brasília nesta leitura | **0** | Violações do estado atual |

Todos os 24 SELECTs de órfãos retornaram zero. Todas as colunas NOT NULL retornaram zero nulos. Essas contagens individuais constam no [dicionário](DICIONARIO.md) e no JSON.

## O que estas contagens não podem dizer

- Não existe trilha que permita contar reativações passadas de contas excluídas. A contagem de excluídos atuais é 0; não apresentá-la como número de reativações passadas.
- A base tem 0 MASTER ativo. A regra aprovada impede perder o último quando ele existe; não obriga criar um MASTER durante a inicialização. Não provisionar contas automaticamente.
- Despesas e tarefas ainda não registram a identidade do reenvio. Não é possível contar duplicações de operação retroativamente. Duas linhas com o mesmo título/valor podem ser intencionais; não criar UNIQUE de conteúdo.
- Imutabilidade e histórico são regras de transição. Para futuras alterações de triggers, preservar definições anteriores e provar os eventos com fixtures em banco de testes; uma fotografia não comprova o passado.

## Expressões verificadas sem inserir registros

`NULL::integer >= 0` resultou em NULL: true. CHECK aceita resultado desconhecido, portanto o caso exclusao precisa exigir IS NOT NULL explicitamente.

`'NaN'::numeric(12,2) > 0` resultou em true. Logo, apenas valor > 0 não expressa o domínio monetário finito.

Emoji: PostgreSQL contou 1 ponto de código; a expressão equivalente a UTF-16 contou 2 unidades. Os limites propostos C08/C29–C36 preservam os limites do código e não proíbem acentos nem emoji.

Fuso atual da conexão: `Etc/UTC`. A view depende de CURRENT_DATE da sessão; na fotografia houve 0 divergências. O exemplo fixo de 01:00 UTC mostrou datas UTC/Brasília diferentes e consta no JSON; a contagem zero de agora não elimina a diferença na fronteira do dia.
