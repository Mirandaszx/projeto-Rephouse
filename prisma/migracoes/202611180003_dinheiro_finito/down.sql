BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Retira apenas as garantias desta migration; preserva os dados e regras anteriores.
ALTER TABLE despesas DROP CONSTRAINT aud_despesas_valor_total_finito;
ALTER TABLE rateios_despesa DROP CONSTRAINT aud_rateios_despesa_valor_devido_finito;
ALTER TABLE rateios_despesa DROP CONSTRAINT aud_rateios_despesa_valor_pago_finito;
ALTER TABLE pagamentos DROP CONSTRAINT aud_pagamentos_valor_finito;
ALTER TABLE configuracoes_recorrencia DROP CONSTRAINT aud_configuracoes_recorrencia_valor_total_finito;

COMMIT;
