BEGIN;

ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_nome_check CHECK (btrim(nome) <> ''),
  ADD CONSTRAINT usuarios_email_check CHECK (email = lower(btrim(email)) AND email LIKE '%_@_%._%'),
  ADD CONSTRAINT usuarios_hash_check CHECK (senha_hash ~ '^\$(2[aby]|argon2(id|i|d))\$');
ALTER TABLE republicas
  ADD CONSTRAINT republicas_nome_check CHECK (btrim(nome) <> ''),
  ADD CONSTRAINT republicas_codigo_check CHECK (codigo_entrada ~ '^[A-Z0-9]{6,32}$');
ALTER TABLE despesas
  ADD CONSTRAINT despesas_valor_check CHECK (valor_total > 0),
  ADD CONSTRAINT despesas_titulo_check CHECK (btrim(titulo) <> ''),
  ADD CONSTRAINT despesas_categoria_check CHECK (btrim(categoria) <> '');
ALTER TABLE rateios_despesa
  ADD CONSTRAINT rateios_valor_check CHECK (valor_devido > 0 AND valor_pago IN (0, valor_devido)),
  ADD CONSTRAINT rateios_status_check CHECK (
    (status = 'PAGO' AND valor_pago = valor_devido) OR (status = 'PENDENTE' AND valor_pago = 0)
  );
ALTER TABLE pagamentos ADD CONSTRAINT pagamentos_valor_check CHECK (valor > 0);
ALTER TABLE tarefas ADD CONSTRAINT tarefas_titulo_check CHECK (btrim(titulo) <> '');

CREATE UNIQUE INDEX membros_um_vinculo_ativo ON membros_republica (usuario_id) WHERE ativo;

-- Administrador, república e vínculo são criados/transferidos na mesma transação.
CREATE FUNCTION validar_administradores() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM republicas r
    JOIN usuarios u ON u.id = r.admin_id
    WHERE u.tipo_usuario NOT IN ('USUARIO_ADMIN', 'USUARIO_MASTER')
       OR NOT EXISTS (
         SELECT 1 FROM membros_republica m
         WHERE m.usuario_id = r.admin_id AND m.republica_id = r.id AND m.ativo
       )
  ) THEN
    RAISE EXCEPTION 'O administrador deve ter perfil ADMIN/MASTER e vínculo ativo na república';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER republicas_admin_check AFTER INSERT OR UPDATE ON republicas
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validar_administradores();
CREATE CONSTRAINT TRIGGER membros_admin_check AFTER INSERT OR UPDATE OR DELETE ON membros_republica
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validar_administradores();
CREATE CONSTRAINT TRIGGER usuarios_admin_check AFTER UPDATE ON usuarios
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validar_administradores();

CREATE FUNCTION preservar_identidade_membro() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.usuario_id <> OLD.usuario_id OR NEW.republica_id <> OLD.republica_id THEN
    RAISE EXCEPTION 'O vínculo não pode mudar de usuário ou república; desative-o e crie outro';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER membros_identidade_check BEFORE UPDATE ON membros_republica
  FOR EACH ROW EXECUTE FUNCTION preservar_identidade_membro();

CREATE FUNCTION validar_despesa() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.republica_id <> OLD.republica_id THEN
      RAISE EXCEPTION 'Uma despesa não pode mudar de república';
    END IF;
    IF NEW.valor_total <> OLD.valor_total AND EXISTS (
      SELECT 1 FROM pagamentos p JOIN rateios_despesa rd ON rd.id = p.rateio_id
      WHERE rd.despesa_id = OLD.id
    ) THEN
      RAISE EXCEPTION 'Uma despesa com pagamento não pode ter seu valor alterado';
    END IF;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.criada_por_id IS DISTINCT FROM OLD.criada_por_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM usuarios u JOIN republicas r ON r.id = NEW.republica_id
      WHERE u.id = NEW.criada_por_id AND u.ativo AND r.ativa
        AND (u.tipo_usuario = 'USUARIO_MASTER' OR
          (u.tipo_usuario = 'USUARIO_ADMIN' AND r.admin_id = u.id AND EXISTS (
            SELECT 1 FROM membros_republica m
            WHERE m.usuario_id = u.id AND m.republica_id = r.id AND m.ativo
          )))
    ) THEN
      RAISE EXCEPTION 'A despesa exige administrador da própria república ou MASTER ativo';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER despesas_validar BEFORE INSERT OR UPDATE ON despesas
  FOR EACH ROW EXECUTE FUNCTION validar_despesa();

CREATE FUNCTION validar_rateio() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  despesa_alvo uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN despesa_alvo := OLD.despesa_id;
  ELSE despesa_alvo := NEW.despesa_id;
  END IF;
  -- A mesma despesa serializa novos rateios, ajustes e pagamentos concorrentes.
  PERFORM 1 FROM despesas WHERE id = despesa_alvo FOR UPDATE;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.despesa_id <> OLD.despesa_id OR NEW.membro_id <> OLD.membro_id THEN
      RAISE EXCEPTION 'Um rateio não pode mudar de despesa ou membro';
    END IF;
    IF NEW.valor_devido <> OLD.valor_devido AND EXISTS (
      SELECT 1 FROM pagamentos p JOIN rateios_despesa rd ON rd.id = p.rateio_id
      WHERE rd.despesa_id = despesa_alvo
    ) THEN
      RAISE EXCEPTION 'Não é permitido alterar rateios de uma despesa com pagamento';
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM membros_republica m
      JOIN despesas d ON d.republica_id = m.republica_id
      JOIN usuarios u ON u.id = m.usuario_id
      JOIN republicas r ON r.id = m.republica_id
      WHERE m.id = NEW.membro_id AND d.id = NEW.despesa_id AND m.ativo AND u.ativo AND r.ativa
    ) THEN
      RAISE EXCEPTION 'O membro do rateio deve estar ativo e pertencer à república da despesa';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pagamentos p JOIN rateios_despesa rd ON rd.id = p.rateio_id
      WHERE rd.despesa_id = despesa_alvo
    ) THEN
      RAISE EXCEPTION 'Não é permitido incluir rateios após o primeiro pagamento';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rateios_validar BEFORE INSERT OR UPDATE OR DELETE ON rateios_despesa
  FOR EACH ROW EXECUTE FUNCTION validar_rateio();

-- A soma e os estados derivados são validados no COMMIT, nunca entre inserts do rateio.
CREATE FUNCTION validar_financeiro() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  despesa_alvo uuid;
  valor_despesa numeric;
  estado_despesa "StatusDespesa";
  total numeric;
  menor numeric;
  maior numeric;
  quantidade integer;
  pendentes integer;
BEGIN
  IF TG_TABLE_NAME = 'despesas' THEN despesa_alvo := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN despesa_alvo := OLD.despesa_id;
  ELSE despesa_alvo := NEW.despesa_id;
  END IF;
  SELECT valor_total, status INTO valor_despesa, estado_despesa FROM despesas WHERE id = despesa_alvo;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT coalesce(sum(valor_devido), 0), min(valor_devido), max(valor_devido), count(*),
    count(*) FILTER (WHERE status = 'PENDENTE')
    INTO total, menor, maior, quantidade, pendentes
    FROM rateios_despesa WHERE despesa_id = despesa_alvo;
  IF quantidade = 0 OR total <> valor_despesa OR maior - menor > 0.01 THEN
    RAISE EXCEPTION 'Os rateios devem dividir igualmente e somar exatamente o total da despesa';
  END IF;
  IF EXISTS (
    SELECT 1 FROM rateios_despesa rd LEFT JOIN pagamentos p ON p.rateio_id = rd.id
    WHERE rd.despesa_id = despesa_alvo
      AND (rd.valor_pago <> coalesce(p.valor, 0)
        OR (p.id IS NOT NULL AND (p.membro_id <> rd.membro_id OR p.valor <> rd.valor_devido)))
  ) THEN
    RAISE EXCEPTION 'O valor pago deve corresponder ao pagamento integral registrado';
  END IF;
  IF (estado_despesa = 'PAGA') <> (pendentes = 0) THEN
    RAISE EXCEPTION 'O status da despesa deve refletir a quitação de todos os rateios';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER despesas_financeiro_check AFTER INSERT OR UPDATE ON despesas
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validar_financeiro();
CREATE CONSTRAINT TRIGGER rateios_financeiro_check AFTER INSERT OR UPDATE OR DELETE ON rateios_despesa
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validar_financeiro();

CREATE FUNCTION validar_pagamento() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  rateio rateios_despesa%ROWTYPE;
  despesa_alvo uuid;
BEGIN
  SELECT despesa_id INTO despesa_alvo FROM rateios_despesa WHERE id = NEW.rateio_id;
  PERFORM 1 FROM despesas WHERE id = despesa_alvo FOR UPDATE;
  SELECT * INTO rateio FROM rateios_despesa WHERE id = NEW.rateio_id FOR UPDATE;
  IF NOT FOUND OR rateio.membro_id <> NEW.membro_id THEN
    RAISE EXCEPTION 'O pagamento deve pertencer ao membro do rateio';
  END IF;
  IF NEW.valor <> rateio.valor_devido OR rateio.valor_pago <> 0 THEN
    RAISE EXCEPTION 'O pagamento deve quitar exatamente o rateio, uma única vez';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pagamentos_validar BEFORE INSERT ON pagamentos
  FOR EACH ROW EXECUTE FUNCTION validar_pagamento();

CREATE FUNCTION preservar_pagamento() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Pagamentos são históricos e não podem ser editados ou excluídos no MVP';
END;
$$;
CREATE TRIGGER pagamentos_historico BEFORE UPDATE OR DELETE ON pagamentos
  FOR EACH ROW EXECUTE FUNCTION preservar_pagamento();

CREATE FUNCTION sincronizar_pagamento() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  despesa_alvo uuid;
BEGIN
  UPDATE rateios_despesa SET valor_pago = NEW.valor, status = 'PAGO'
    WHERE id = NEW.rateio_id RETURNING despesa_id INTO despesa_alvo;
  UPDATE despesas SET status = CASE WHEN EXISTS (
    SELECT 1 FROM rateios_despesa WHERE despesa_id = despesa_alvo AND status = 'PENDENTE'
  ) THEN 'PENDENTE'::"StatusDespesa" ELSE 'PAGA'::"StatusDespesa" END
    WHERE id = despesa_alvo;
  RETURN NULL;
END;
$$;
CREATE TRIGGER pagamentos_sincronizar AFTER INSERT ON pagamentos
  FOR EACH ROW EXECUTE FUNCTION sincronizar_pagamento();

CREATE FUNCTION validar_responsavel_tarefa() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id
    OR NEW.republica_id IS DISTINCT FROM OLD.republica_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM membros_republica m JOIN usuarios u ON u.id = m.usuario_id
      JOIN republicas r ON r.id = m.republica_id
      WHERE m.id = NEW.responsavel_id AND m.republica_id = NEW.republica_id
        AND m.ativo AND u.ativo AND r.ativa
    ) THEN
      RAISE EXCEPTION 'O responsável da tarefa deve estar ativo na mesma república';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER tarefas_responsavel_check BEFORE INSERT OR UPDATE ON tarefas
  FOR EACH ROW EXECUTE FUNCTION validar_responsavel_tarefa();

-- VENCIDA é calculada a cada consulta, pois depende da data corrente.
CREATE VIEW despesas_com_status AS
  SELECT d.*, CASE WHEN d.status = 'PAGA' THEN 'PAGA'
    WHEN d.vencimento < CURRENT_DATE THEN 'VENCIDA' ELSE 'PENDENTE' END AS status_calculado
  FROM despesas d;

COMMIT;
