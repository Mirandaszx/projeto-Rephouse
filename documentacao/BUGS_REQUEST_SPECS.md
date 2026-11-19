# Bugs reproduzidos pelos request specs

Expectativas confirmadas pelo usuário em 18/11/2026. Nenhuma correção do produto foi feita nesta etapa. Nenhuma falha foi ignorada ou convertida em sucesso esperado.

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

O comando completo retorna código 1 enquanto houver essas falhas. O relatório local registra as contagens reais; não existe aprovação remota desta entrega.
