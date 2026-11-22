BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE operacoes_criacao (
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  operacao varchar(16) NOT NULL CHECK (operacao IN ('DESPESA', 'TAREFA')),
  chave uuid NOT NULL,
  republica_id uuid NOT NULL REFERENCES republicas(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  hash_requisicao char(64) NOT NULL CHECK (hash_requisicao ~ '^[a-f0-9]{64}$'),
  despesa_id uuid UNIQUE REFERENCES despesas(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  tarefa_id uuid UNIQUE REFERENCES tarefas(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  resposta jsonb NOT NULL CHECK (jsonb_typeof(resposta) = 'object'),
  criada_em timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT operacoes_criacao_pkey PRIMARY KEY (usuario_id, operacao, chave),
  CONSTRAINT operacoes_criacao_destino CHECK (
    (operacao = 'DESPESA' AND despesa_id IS NOT NULL AND tarefa_id IS NULL)
    OR (operacao = 'TAREFA' AND tarefa_id IS NOT NULL AND despesa_id IS NULL)
  ),
  CONSTRAINT operacoes_criacao_resposta_id CHECK (
    resposta ? 'id' AND (resposta->>'id') IS NOT NULL
    AND resposta->>'id' = coalesce(despesa_id, tarefa_id)::text
  )
);
CREATE INDEX operacoes_criacao_republica_idx ON operacoes_criacao(republica_id);

CREATE FUNCTION validar_operacao_criacao() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Registro de criacao imutavel' USING ERRCODE = 'RH001';
  END IF;
  IF NEW.operacao = 'DESPESA' AND NOT EXISTS (
    SELECT 1 FROM despesas WHERE id = NEW.despesa_id
      AND republica_id = NEW.republica_id AND criada_por_id = NEW.usuario_id
  ) THEN
    RAISE EXCEPTION 'Origem de criacao invalida' USING ERRCODE = '23514';
  ELSIF NEW.operacao = 'TAREFA' AND NOT EXISTS (
    SELECT 1 FROM tarefas WHERE id = NEW.tarefa_id AND republica_id = NEW.republica_id
  ) THEN
    RAISE EXCEPTION 'Origem de criacao invalida' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER operacoes_criacao_integridade BEFORE INSERT OR UPDATE OR DELETE
  ON operacoes_criacao FOR EACH ROW EXECUTE FUNCTION validar_operacao_criacao();
COMMIT;
