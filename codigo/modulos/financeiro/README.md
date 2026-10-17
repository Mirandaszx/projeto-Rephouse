# Financeiro

O módulo implementa despesas, rateios iguais entre selecionados, pagamentos parciais/integrais, histórico próprio e comprovantes privados.

- `financeiro.service.ts`: regras e coordenação de transações ACID.
- `financeiro.repository.ts`: consultas e gravações usando o `tx` recebido.
- `financeiro.types.ts`: contratos de entrada e retorno.
- `dominio/rateio.ts`: divisão pura em centavos.

Rotas e controllers validam dados e usam os métodos de `createFinanceiroService`, que conferem identidade, propriedade e escopo dentro da transação. Os helpers `criarDespesaComRateio` e `registrarPagamento` são internos, sem autorização HTTP, e servem aos testes de integridade. O banco mantém as validações financeiras.

Pagamentos exigem chave de idempotência na API, nunca ultrapassam o saldo e não podem ser editados ou excluídos. Após o primeiro pagamento, valor e participantes da despesa ficam imutáveis. Os arquivos são opcionais e escritos fora do retry; sua política está em `documentacao/MIGRACAO_DJANGO.md`.
