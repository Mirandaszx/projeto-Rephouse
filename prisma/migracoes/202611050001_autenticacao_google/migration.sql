-- A senha pode estar ausente somente quando existe outro método de acesso.
ALTER TABLE usuarios ALTER COLUMN senha_hash DROP NOT NULL;
CREATE TABLE identidades_google (
  sub varchar(255) PRIMARY KEY CHECK (length(sub) BETWEEN 1 AND 255),
  usuario_id uuid NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  criada_em timestamptz(3) NOT NULL DEFAULT now()
);
CREATE TABLE desafios_google (
  id uuid PRIMARY KEY,
  nonce_hash char(64) NOT NULL CHECK (nonce_hash ~ '^[a-f0-9]{64}$'),
  cookie_hash char(64) NOT NULL CHECK (cookie_hash ~ '^[a-f0-9]{64}$'),
  finalidade varchar(20) NOT NULL CHECK (finalidade IN ('login', 'exclusao')),
  usuario_id uuid REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  versao_token integer,
  expira_em timestamptz(3) NOT NULL,
  consumido_em timestamptz(3),
  CHECK ((finalidade = 'login' AND usuario_id IS NULL AND versao_token IS NULL)
      OR (finalidade = 'exclusao' AND usuario_id IS NOT NULL AND versao_token >= 0))
);
CREATE INDEX desafios_google_expira_em_idx ON desafios_google(expira_em);
-- A identidade é inserida depois do usuário, na mesma transação. Conferir no commit.
CREATE FUNCTION conferir_metodo_acesso() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE alvo uuid;
BEGIN
  IF TG_TABLE_NAME = 'usuarios' THEN
    alvo := COALESCE(NEW.id, OLD.id);
  ELSE
    alvo := OLD.usuario_id;
  END IF;
  PERFORM id FROM usuarios WHERE id = alvo FOR UPDATE;
  IF EXISTS (SELECT 1 FROM usuarios u WHERE u.id = alvo AND u.senha_hash IS NULL
      AND NOT EXISTS (SELECT 1 FROM identidades_google g WHERE g.usuario_id = u.id)) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Conta exige um método de acesso';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER usuario_exige_acesso AFTER INSERT OR UPDATE ON usuarios
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION conferir_metodo_acesso();
CREATE CONSTRAINT TRIGGER identidade_preserva_acesso AFTER DELETE OR UPDATE ON identidades_google
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION conferir_metodo_acesso();
