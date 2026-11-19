BEGIN;
SET LOCAL lock_timeout = '2s';
DROP TRIGGER usuarios_preservar_ultimo_master ON usuarios;
DROP TRIGGER usuarios_exclusao_irreversivel ON usuarios;
DROP TRIGGER usuarios_transicoes_serializar ON usuarios;
DROP FUNCTION aud_preservar_ultimo_master();
DROP FUNCTION aud_preservar_exclusao_usuario();
DROP FUNCTION aud_serializar_transicoes_usuarios();
COMMIT;
