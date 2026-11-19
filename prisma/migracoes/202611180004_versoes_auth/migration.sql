BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Regras adicionais: nenhum registro é corrigido ou removido.
ALTER TABLE usuarios ADD CONSTRAINT aud_usuarios_versao_token CHECK (versao_token >= 0) NOT VALID;
ALTER TABLE usuarios VALIDATE CONSTRAINT aud_usuarios_versao_token;

ALTER TABLE desafios_google ADD CONSTRAINT aud_desafios_google_versao_exclusao CHECK (finalidade <> 'exclusao' OR (versao_token IS NOT NULL AND versao_token >= 0)) NOT VALID;
ALTER TABLE desafios_google VALIDATE CONSTRAINT aud_desafios_google_versao_exclusao;

COMMIT;
