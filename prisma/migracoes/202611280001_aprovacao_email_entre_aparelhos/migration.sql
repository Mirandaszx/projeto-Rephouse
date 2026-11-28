ALTER TABLE links_email
  ADD COLUMN codigo_aprovacao_hash char(64),
  ADD COLUMN tentativas_aprovacao integer NOT NULL DEFAULT 0,
  ADD COLUMN aprovado_em timestamptz(3),
  ADD CHECK (codigo_aprovacao_hash IS NULL OR codigo_aprovacao_hash ~ '^[a-f0-9]{64}$'),
  ADD CHECK (tentativas_aprovacao BETWEEN 0 AND 5),
  ADD CHECK (aprovado_em IS NULL OR (codigo_aprovacao_hash IS NOT NULL AND aprovado_em >= criado_em AND aprovado_em < expira_em));
