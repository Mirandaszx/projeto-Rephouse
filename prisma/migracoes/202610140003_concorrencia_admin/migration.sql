BEGIN;

-- O MVP serializa alterações administrativas, que são pouco frequentes.
-- BEFORE STATEMENT obtém o lock antes dos locks individuais de linha.
-- Isso impede write skew entre transferir a administração e desativar o novo admin.
CREATE FUNCTION serializar_administracao() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(20261014, 1);
  RETURN NULL;
END;
$$;

CREATE TRIGGER usuarios_serializar_admin BEFORE UPDATE OR DELETE ON usuarios
  FOR EACH STATEMENT EXECUTE FUNCTION serializar_administracao();
CREATE TRIGGER republicas_serializar_admin BEFORE INSERT OR UPDATE OR DELETE ON republicas
  FOR EACH STATEMENT EXECUTE FUNCTION serializar_administracao();
CREATE TRIGGER membros_serializar_admin BEFORE INSERT OR UPDATE OR DELETE ON membros_republica
  FOR EACH STATEMENT EXECUTE FUNCTION serializar_administracao();

COMMIT;
