BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Retira apenas as garantias desta migration; preserva os dados e regras anteriores.
ALTER TABLE pagamentos DROP CONSTRAINT aud_pagamentos_hash_requisicao;
ALTER TABLE recorrencias_despesa DROP CONSTRAINT aud_recorrencias_hash_requisicao;

COMMIT;
