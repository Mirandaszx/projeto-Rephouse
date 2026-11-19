BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Retira apenas as garantias desta migration; preserva os dados e regras anteriores.
ALTER TABLE usuarios DROP CONSTRAINT aud_usuarios_email_formato;

COMMIT;
