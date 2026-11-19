BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE FUNCTION aud_serializar_transicoes_usuarios() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Mesma chave da serialização administrativa existente, antes dos locks da operação.
  PERFORM pg_advisory_xact_lock(20261014, 1);
  -- O advisory lock sozinho não renova snapshots REPEATABLE READ. Bloquear também
  -- as linhas elegíveis força erro de serialização se outro MASTER mudou no intervalo.
  -- Ordem estável evita inversão de locks; não altera nenhum registro.
  PERFORM id FROM usuarios
    WHERE tipo_usuario = 'USUARIO_MASTER' AND ativo AND excluido_em IS NULL
    ORDER BY id FOR UPDATE;
  RETURN NULL;
END;
$$;
CREATE TRIGGER usuarios_transicoes_serializar BEFORE INSERT OR UPDATE OR DELETE ON usuarios
  FOR EACH STATEMENT EXECUTE FUNCTION aud_serializar_transicoes_usuarios();

CREATE FUNCTION aud_preservar_exclusao_usuario() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.excluido_em IS NOT NULL AND
    (NEW.excluido_em IS DISTINCT FROM OLD.excluido_em OR NEW.ativo) THEN
    RAISE EXCEPTION 'A exclusão lógica da conta é irreversível' USING ERRCODE = 'RH001';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER usuarios_exclusao_irreversivel BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION aud_preservar_exclusao_usuario();

CREATE FUNCTION aud_preservar_ultimo_master() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Ausência inicial é permitida. Conferir somente a perda de um MASTER elegível.
  IF OLD.tipo_usuario = 'USUARIO_MASTER' AND OLD.ativo AND OLD.excluido_em IS NULL THEN
    IF TG_OP = 'DELETE' OR NOT
      (NEW.tipo_usuario = 'USUARIO_MASTER' AND NEW.ativo AND NEW.excluido_em IS NULL) THEN
      IF NOT EXISTS (SELECT 1 FROM usuarios
        WHERE tipo_usuario = 'USUARIO_MASTER' AND ativo AND excluido_em IS NULL) THEN
        RAISE EXCEPTION 'O último MASTER ativo deve ser preservado' USING ERRCODE = 'RH001';
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
-- A validação diferida permite substituição em qualquer ordem dentro da transação.
CREATE CONSTRAINT TRIGGER usuarios_preservar_ultimo_master AFTER UPDATE OR DELETE ON usuarios
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aud_preservar_ultimo_master();

COMMIT;
