BEGIN;
CREATE TABLE fotos_perfil (
  usuario_id uuid PRIMARY KEY REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  conteudo bytea NOT NULL,
  mime_type varchar(32) NOT NULL CHECK (mime_type = 'image/webp'),
  tamanho integer NOT NULL CHECK (tamanho > 0 AND tamanho <= 524288 AND tamanho = octet_length(conteudo)),
  hash_sha256 char(64) NOT NULL CHECK (hash_sha256 ~ '^[a-f0-9]{64}$'),
  atualizada_em timestamptz(3) NOT NULL DEFAULT now()
);
COMMIT;
