BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Regras adicionais: nenhum registro é corrigido ou removido.
ALTER TABLE pagamentos ADD CONSTRAINT aud_pagamentos_hash_requisicao CHECK (hash_requisicao IS NULL OR hash_requisicao ~ '^[a-f0-9]{64}$') NOT VALID;
ALTER TABLE pagamentos VALIDATE CONSTRAINT aud_pagamentos_hash_requisicao;

ALTER TABLE recorrencias_despesa ADD CONSTRAINT aud_recorrencias_hash_requisicao CHECK (hash_requisicao ~ '^[a-f0-9]{64}$') NOT VALID;
ALTER TABLE recorrencias_despesa VALIDATE CONSTRAINT aud_recorrencias_hash_requisicao;

COMMIT;
