BEGIN;
ALTER TABLE usuarios ADD COLUMN versao_token integer NOT NULL DEFAULT 0,
  ADD COLUMN excluido_em timestamptz(3),
  ADD CONSTRAINT usuarios_exclusao_check CHECK (excluido_em IS NULL OR NOT ativo);
ALTER TABLE republicas ADD COLUMN endereco varchar(255);
DROP INDEX "pagamentos_rateio_id_key";
CREATE INDEX "pagamentos_rateio_id_idx" ON pagamentos(rateio_id);
ALTER TABLE pagamentos ADD COLUMN chave_idempotencia uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN hash_requisicao varchar(64);
CREATE UNIQUE INDEX "pagamentos_chave_idempotencia_key" ON pagamentos(chave_idempotencia);
ALTER TABLE rateios_despesa DROP CONSTRAINT rateios_valor_check, DROP CONSTRAINT rateios_status_check;
ALTER TABLE rateios_despesa
  ADD CONSTRAINT rateios_valor_check CHECK (valor_devido > 0 AND valor_pago >= 0 AND valor_pago <= valor_devido),
  ADD CONSTRAINT rateios_status_check CHECK (
    (status = 'PENDENTE' AND valor_pago = 0) OR
    (status = 'PARCIAL' AND valor_pago > 0 AND valor_pago < valor_devido) OR
    (status = 'PAGO' AND valor_pago = valor_devido));

CREATE OR REPLACE FUNCTION validar_pagamento() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rateio rateios_despesa%ROWTYPE; despesa_alvo uuid;
BEGIN
  SELECT despesa_id INTO despesa_alvo FROM rateios_despesa WHERE id = NEW.rateio_id;
  -- Mesma ordem de locks para todos os pagamentos: despesa, depois rateio.
  PERFORM 1 FROM despesas WHERE id = despesa_alvo FOR UPDATE;
  SELECT * INTO rateio FROM rateios_despesa WHERE id = NEW.rateio_id FOR UPDATE;
  IF NOT FOUND OR rateio.membro_id <> NEW.membro_id THEN
    RAISE EXCEPTION 'O pagamento deve pertencer ao membro do rateio';
  END IF;
  IF NEW.valor <= 0 OR NEW.valor > rateio.valor_devido - rateio.valor_pago THEN
    RAISE EXCEPTION 'O pagamento ultrapassa o saldo pendente do rateio';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION sincronizar_pagamento() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE despesa_alvo uuid; total numeric;
BEGIN
  SELECT sum(valor) INTO total FROM pagamentos WHERE rateio_id = NEW.rateio_id;
  UPDATE rateios_despesa SET valor_pago = total,
    status = CASE WHEN total = valor_devido THEN 'PAGO'::"StatusRateio" ELSE 'PARCIAL'::"StatusRateio" END
    WHERE id = NEW.rateio_id RETURNING despesa_id INTO despesa_alvo;
  UPDATE despesas SET status = CASE WHEN EXISTS (
    SELECT 1 FROM rateios_despesa WHERE despesa_id = despesa_alvo AND status <> 'PAGO'
  ) THEN 'PENDENTE'::"StatusDespesa" ELSE 'PAGA'::"StatusDespesa" END WHERE id = despesa_alvo;
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION validar_financeiro() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE alvo uuid; valor_despesa numeric; estado "StatusDespesa";
  total numeric; menor numeric; maior numeric; quantidade integer; pendentes integer;
BEGIN
  IF TG_TABLE_NAME = 'despesas' THEN alvo := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN alvo := OLD.despesa_id; ELSE alvo := NEW.despesa_id; END IF;
  SELECT valor_total, status INTO valor_despesa, estado FROM despesas WHERE id = alvo;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT coalesce(sum(valor_devido), 0), min(valor_devido), max(valor_devido), count(*),
    count(*) FILTER (WHERE status <> 'PAGO') INTO total, menor, maior, quantidade, pendentes
    FROM rateios_despesa WHERE despesa_id = alvo;
  IF quantidade = 0 OR total <> valor_despesa OR maior - menor > 0.01 THEN
    RAISE EXCEPTION 'Os rateios devem dividir igualmente e somar exatamente o total da despesa';
  END IF;
  -- Agregar por rateio evita duplicar valores devidos quando há vários pagamentos.
  IF EXISTS (SELECT 1 FROM rateios_despesa r WHERE r.despesa_id = alvo
    AND r.valor_pago <> (SELECT coalesce(sum(p.valor),0) FROM pagamentos p WHERE p.rateio_id = r.id)) THEN
    RAISE EXCEPTION 'O valor pago deve corresponder à soma dos pagamentos registrados';
  END IF;
  IF (estado = 'PAGA') <> (pendentes = 0) THEN
    RAISE EXCEPTION 'O status da despesa deve refletir a quitação de todos os rateios';
  END IF;
  RETURN NULL;
END; $$;

-- A exclusão da conta nunca apaga a trilha financeira nem deixa administração órfã.
CREATE FUNCTION validar_exclusao_conta() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.excluido_em IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM republicas WHERE admin_id = NEW.id)
      OR EXISTS (SELECT 1 FROM membros_republica WHERE usuario_id = NEW.id AND ativo)
      OR EXISTS (SELECT 1 FROM rateios_despesa r JOIN membros_republica m ON m.id = r.membro_id
        WHERE m.usuario_id = NEW.id AND r.valor_pago < r.valor_devido) THEN
      RAISE EXCEPTION 'Transfira a administração, encerre os vínculos e quite as dívidas antes de excluir a conta';
    END IF;
  END IF;
  RETURN NULL;
END; $$;
CREATE CONSTRAINT TRIGGER usuarios_exclusao_conta_check AFTER UPDATE ON usuarios
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validar_exclusao_conta();

CREATE OR REPLACE VIEW despesas_com_status AS SELECT d.*,
  CASE WHEN d.status = 'PAGA' THEN 'PAGA'
    WHEN d.vencimento < (now() AT TIME ZONE 'America/Fortaleza')::date THEN 'VENCIDA'
    ELSE 'PENDENTE' END AS status_calculado FROM despesas d;
COMMIT;
