BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Regras adicionais: nenhum registro é corrigido ou removido.
ALTER TABLE usuarios ADD CONSTRAINT aud_usuarios_email_formato CHECK (email ~ '^(?:[A-Za-z0-9_''+\-]+\.)*[A-Za-z0-9_''+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$') NOT VALID;
ALTER TABLE usuarios VALIDATE CONSTRAINT aud_usuarios_email_formato;

COMMIT;
