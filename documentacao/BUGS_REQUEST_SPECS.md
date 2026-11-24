# Bugs reproduzidos pelos request specs

Expectativas confirmadas pelo usuário em 18/11/2026. O diagnóstico abaixo registra a etapa original, quando nenhuma correção do produto havia sido feita. Nenhuma falha foi ignorada ou convertida em sucesso esperado.

## Revisão 2.2.1

Foram implementadas a validação monetária em etapas e a identidade transacional das criações de despesas e tarefas, com proteção nos formulários. Consulte [a implementação e seus limites](CORRECOES_2_2_1.md) e [o resultado local desta revisão](evidencias/correcao-bugs-2-2-1.json). As descrições e contagens abaixo são históricas; não devem ser usadas como resultado de uma execução posterior.

BUG-01, BUG-02 e BUG-03 foram corrigidos nos cenários auditados: `npm run test:completo` passou com 285 testes, zero falhas e zero ignorados. Na interface, 70 dos 71 testes passaram; a falha de animação preexistente permanece registrada separadamente e impede declarar a suíte completa aprovada.

## BUG-01 — Criação de despesa não respeita a identidade da operação

- Rota: `POST /api/despesas`, com `Idempotency-Key` UUID.
- Esperado: reenvio sequencial/simultâneo da mesma chave e corpo retorna a mesma despesa; outra carga com a chave retorna 409 sem nova escrita. Chave nova permite uma criação intencional igual.
- Observado: reenvios devolvem IDs diferentes; concorrência grava duas despesas; conteúdo divergente também retorna 201.
- Impacto: um reenvio pode duplicar contas e obrigações dos moradores.
- Reprodução: `npm run test:completo`, suíte **Criação de despesas: identidade da operação**, três casos falhando e um caso positivo.

## BUG-02 — Criação de tarefa não respeita a identidade da operação

- Rota: `POST /api/tarefas`, com `Idempotency-Key` UUID.
- Esperado: mesma regra de identidade da operação; dados iguais com chave nova continuam permitidos.
- Observado: IDs diferentes e duas tarefas no reenvio; conteúdo divergente retorna 201 em vez de 409.
- Impacto: repetição de tarefas por reenvio ou concorrência.
- Reprodução: `npm run test:completo`, suíte **Criação de tarefas: identidade da operação**, três casos falhando e um caso positivo.

## BUG-03 — Valor com vírgula provoca erro interno

- Rota reproduzida: `POST /api/despesas`.
- Entrada: administrador válido, participantes ativos, demais campos válidos e `valorTotal: "1,00"`.
- Esperado: `400`, mantendo o contrato de entrada monetária com ponto e sem qualquer gravação.
- Observado: `500` com mensagem pública genérica. A rejeição não deve ser tratada como falha inesperada.
- Causa indicada pela inspeção: a validação monetária encadeia uma expressão regular e uma conversão `Prisma.Decimal` em `refine`; uma string não numérica pode alcançar a conversão e lançar uma exceção fora do erro de validação esperado.
- A função é compartilhada com outras entradas financeiras; não se afirma reprodução nessas outras rotas sem executá-las.
- Reprodução: `npm run test:completo`, suíte **Despesas, rateio e pagamentos por HTTP**, cenário **quando valor ou participantes são inválidos**, subcaso de `"1,00"`.

## Leitura do resultado

São três problemas de produto. BUG-01 e BUG-02 geram três falhas cada. BUG-03 também pode fazer o teste agrupador aparecer como falho no TAP, além do subcaso. Por isso a quantidade de testes falhando não corresponde à quantidade de bugs distintos.

O comando completo retorna código 1 enquanto houver falhas. Os relatórios locais de cada etapa registram suas contagens reais; não existe aprovação remota desta revisão.
