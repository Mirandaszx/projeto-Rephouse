BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Regras adicionais: nenhum registro é corrigido ou removido.
ALTER TABLE despesas ADD CONSTRAINT aud_despesas_valor_total_finito CHECK (valor_total <> 'NaN'::numeric) NOT VALID;
ALTER TABLE despesas VALIDATE CONSTRAINT aud_despesas_valor_total_finito;

ALTER TABLE rateios_despesa ADD CONSTRAINT aud_rateios_despesa_valor_devido_finito CHECK (valor_devido <> 'NaN'::numeric) NOT VALID;
ALTER TABLE rateios_despesa VALIDATE CONSTRAINT aud_rateios_despesa_valor_devido_finito;

ALTER TABLE rateios_despesa ADD CONSTRAINT aud_rateios_despesa_valor_pago_finito CHECK (valor_pago <> 'NaN'::numeric) NOT VALID;
ALTER TABLE rateios_despesa VALIDATE CONSTRAINT aud_rateios_despesa_valor_pago_finito;

ALTER TABLE pagamentos ADD CONSTRAINT aud_pagamentos_valor_finito CHECK (valor <> 'NaN'::numeric) NOT VALID;
ALTER TABLE pagamentos VALIDATE CONSTRAINT aud_pagamentos_valor_finito;

ALTER TABLE configuracoes_recorrencia ADD CONSTRAINT aud_configuracoes_recorrencia_valor_total_finito CHECK (valor_total <> 'NaN'::numeric) NOT VALID;
ALTER TABLE configuracoes_recorrencia VALIDATE CONSTRAINT aud_configuracoes_recorrencia_valor_total_finito;

COMMIT;
