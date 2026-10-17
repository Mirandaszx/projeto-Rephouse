BEGIN;
CREATE TABLE comprovantes (
  pagamento_id uuid PRIMARY KEY REFERENCES pagamentos(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  conteudo bytea NOT NULL,
  mime_type varchar(100) NOT NULL,
  tamanho integer NOT NULL,
  hash_sha256 char(64) NOT NULL,
  criado_em timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT comprovantes_tamanho CHECK (tamanho BETWEEN 1 AND 5242880 AND tamanho = octet_length(conteudo)),
  CONSTRAINT comprovantes_tipo CHECK (mime_type IN ('application/pdf','image/png','image/jpeg','image/webp')),
  CONSTRAINT comprovantes_hash CHECK (hash_sha256 = encode(sha256(conteudo),'hex'))
);
-- Histórico imutável, inclusive por SQL direto. Não altera as regras de pagamentos.
CREATE FUNCTION preservar_comprovante() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Comprovantes históricos não podem ser alterados ou excluídos' USING ERRCODE = 'RH001';
END;
$$;
CREATE TRIGGER comprovantes_historico BEFORE UPDATE OR DELETE ON comprovantes
  FOR EACH ROW EXECUTE FUNCTION preservar_comprovante();
COMMIT;
