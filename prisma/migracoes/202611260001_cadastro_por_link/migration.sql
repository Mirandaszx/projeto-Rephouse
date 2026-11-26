-- Entrar por link com e-mail sem conta (26/11/2026): o link de cadastro pode nascer sem nome, senha e escolha de
-- república; nome e senha são informados na confirmação, e a conta nasce com senha como qualquer cadastro.
-- Mudança aditiva: os dois formatos já existentes continuam válidos exatamente como antes.
DO $$
DECLARE restricao text;
BEGIN
  SELECT conname INTO restricao FROM pg_constraint
   WHERE conrelid = 'links_email'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%argon2id%';
  IF restricao IS NULL THEN RAISE EXCEPTION 'Restrição de formato de links_email não encontrada.'; END IF;
  EXECUTE format('ALTER TABLE links_email DROP CONSTRAINT %I', restricao);
END $$;

ALTER TABLE links_email ADD CONSTRAINT links_email_formato CHECK (
  (finalidade = 'cadastro' AND usuario_id IS NULL AND versao_token IS NULL
    AND nome IS NOT NULL AND senha_hash IS NOT NULL AND char_length(btrim(nome)) BETWEEN 1 AND 120 AND senha_hash LIKE '$argon2id$%' AND acao_republica IS NOT NULL)
  OR (finalidade = 'cadastro' AND usuario_id IS NULL AND versao_token IS NULL
    AND nome IS NULL AND senha_hash IS NULL AND acao_republica IS NULL)
  OR (finalidade = 'login' AND usuario_id IS NOT NULL AND versao_token IS NOT NULL
    AND nome IS NULL AND senha_hash IS NULL AND acao_republica IS NULL)
);
