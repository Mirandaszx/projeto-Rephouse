-- Mudança aditiva. Contas existentes não são marcadas como verificadas.
CREATE TABLE emails_verificados (
  usuario_id uuid PRIMARY KEY REFERENCES usuarios(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  verificado_em timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE links_email (
  id uuid PRIMARY KEY,
  finalidade varchar(10) NOT NULL CHECK (finalidade IN ('cadastro','login')),
  email varchar(254) NOT NULL CHECK (email = lower(btrim(email)) AND char_length(email) BETWEEN 3 AND 254),
  token_hash char(64) NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  cookie_hash char(64) NOT NULL CHECK (cookie_hash ~ '^[a-f0-9]{64}$'),
  usuario_id uuid REFERENCES usuarios(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  versao_token integer CHECK (versao_token >= 0),
  nome varchar(120),
  senha_hash varchar(255),
  acao_republica varchar(6) CHECK (acao_republica IN ('criar','entrar')),
  criado_em timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_em timestamptz(3) NOT NULL,
  consumido_em timestamptz(3),
  CHECK (expira_em > criado_em AND expira_em <= criado_em + interval '10 minutes'),
  CHECK (consumido_em IS NULL OR consumido_em >= criado_em),
  CHECK ((finalidade = 'cadastro' AND usuario_id IS NULL AND versao_token IS NULL
    AND nome IS NOT NULL AND senha_hash IS NOT NULL AND char_length(btrim(nome)) BETWEEN 1 AND 120 AND senha_hash LIKE '$argon2id$%' AND acao_republica IS NOT NULL)
    OR (finalidade = 'login' AND usuario_id IS NOT NULL AND versao_token IS NOT NULL
    AND nome IS NULL AND senha_hash IS NULL AND acao_republica IS NULL))
);
CREATE INDEX links_email_consulta_idx ON links_email(email, finalidade, criado_em DESC);
CREATE INDEX links_email_expiracao_idx ON links_email(expira_em);

-- Também limita solicitações a endereços desconhecidos, sem depender da memória da API.
CREATE TABLE limites_envio_email (
  email_hash char(64) PRIMARY KEY CHECK (email_hash ~ '^[a-f0-9]{64}$'),
  janela_inicio timestamptz(3) NOT NULL,
  ultimo_envio timestamptz(3) NOT NULL,
  quantidade integer NOT NULL CHECK (quantidade BETWEEN 1 AND 3)
);
