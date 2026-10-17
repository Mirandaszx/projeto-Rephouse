-- Mesmas regras já aplicadas; SQLSTATE próprio permite classificar sem ler mensagens.
BEGIN;

CREATE OR REPLACE FUNCTION validar_administradores() RETURNS trigger LANGUAGE plpgsql AS $$
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
    RAISE EXCEPTION 'O administrador deve ter perfil ADMIN/MASTER e vínculo ativo na república' USING ERRCODE = 'RH001';
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION preservar_identidade_membro() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.usuario_id <> OLD.usuario_id OR NEW.republica_id <> OLD.republica_id THEN
    RAISE EXCEPTION 'O vínculo não pode mudar de usuário ou república; desative-o e crie outro' USING ERRCODE = 'RH001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validar_despesa() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.republica_id <> OLD.republica_id THEN
      RAISE EXCEPTION 'Uma despesa não pode mudar de república' USING ERRCODE = 'RH001';
    END IF;
    IF NEW.valor_total <> OLD.valor_total AND EXISTS (
      SELECT 1 FROM pagamentos p JOIN rateios_despesa rd ON rd.id = p.rateio_id
      WHERE rd.despesa_id = OLD.id
    ) THEN
      RAISE EXCEPTION 'Uma despesa com pagamento não pode ter seu valor alterado' USING ERRCODE = 'RH001';
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
      RAISE EXCEPTION 'A despesa exige administrador da própria república ou MASTER ativo' USING ERRCODE = 'RH001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validar_rateio() RETURNS trigger LANGUAGE plpgsql AS $$
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
      RAISE EXCEPTION 'Um rateio não pode mudar de despesa ou membro' USING ERRCODE = 'RH001';
    END IF;
    IF NEW.valor_devido <> OLD.valor_devido AND EXISTS (
      SELECT 1 FROM pagamentos p JOIN rateios_despesa rd ON rd.id = p.rateio_id
      WHERE rd.despesa_id = despesa_alvo
    ) THEN
      RAISE EXCEPTION 'Não é permitido alterar rateios de uma despesa com pagamento' USING ERRCODE = 'RH001';
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
      RAISE EXCEPTION 'O membro do rateio deve estar ativo e pertencer à república da despesa' USING ERRCODE = 'RH001';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pagamentos p JOIN rateios_despesa rd ON rd.id = p.rateio_id
      WHERE rd.despesa_id = despesa_alvo
    ) THEN
      RAISE EXCEPTION 'Não é permitido incluir rateios após o primeiro pagamento' USING ERRCODE = 'RH001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

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
    RAISE EXCEPTION 'Os rateios devem dividir igualmente e somar exatamente o total da despesa' USING ERRCODE = 'RH001';
  END IF;
  -- Agregar por rateio evita duplicar valores devidos quando há vários pagamentos.
  IF EXISTS (SELECT 1 FROM rateios_despesa r WHERE r.despesa_id = alvo
    AND r.valor_pago <> (SELECT coalesce(sum(p.valor),0) FROM pagamentos p WHERE p.rateio_id = r.id)) THEN
    RAISE EXCEPTION 'O valor pago deve corresponder à soma dos pagamentos registrados' USING ERRCODE = 'RH001';
  END IF;
  IF (estado = 'PAGA') <> (pendentes = 0) THEN
    RAISE EXCEPTION 'O status da despesa deve refletir a quitação de todos os rateios' USING ERRCODE = 'RH001';
  END IF;
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION validar_pagamento() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rateio rateios_despesa%ROWTYPE; despesa_alvo uuid;
BEGIN
  SELECT despesa_id INTO despesa_alvo FROM rateios_despesa WHERE id = NEW.rateio_id;
  -- Mesma ordem de locks para todos os pagamentos: despesa, depois rateio.
  PERFORM 1 FROM despesas WHERE id = despesa_alvo FOR UPDATE;
  SELECT * INTO rateio FROM rateios_despesa WHERE id = NEW.rateio_id FOR UPDATE;
  IF NOT FOUND OR rateio.membro_id <> NEW.membro_id THEN
    RAISE EXCEPTION 'O pagamento deve pertencer ao membro do rateio' USING ERRCODE = 'RH001';
  END IF;
  IF NEW.valor <= 0 OR NEW.valor > rateio.valor_devido - rateio.valor_pago THEN
    RAISE EXCEPTION 'O pagamento ultrapassa o saldo pendente do rateio' USING ERRCODE = 'RH001';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION preservar_pagamento() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Pagamentos são históricos e não podem ser editados ou excluídos no MVP' USING ERRCODE = 'RH001';
END;
$$;

CREATE OR REPLACE FUNCTION validar_responsavel_tarefa() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id
    OR NEW.republica_id IS DISTINCT FROM OLD.republica_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM membros_republica m JOIN usuarios u ON u.id = m.usuario_id
      JOIN republicas r ON r.id = m.republica_id
      WHERE m.id = NEW.responsavel_id AND m.republica_id = NEW.republica_id
        AND m.ativo AND u.ativo AND r.ativa
    ) THEN
      RAISE EXCEPTION 'O responsável da tarefa deve estar ativo na mesma república' USING ERRCODE = 'RH001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validar_exclusao_conta() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.excluido_em IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM republicas WHERE admin_id = NEW.id)
      OR EXISTS (SELECT 1 FROM membros_republica WHERE usuario_id = NEW.id AND ativo)
      OR EXISTS (SELECT 1 FROM rateios_despesa r JOIN membros_republica m ON m.id = r.membro_id
        WHERE m.usuario_id = NEW.id AND r.valor_pago < r.valor_devido) THEN
      RAISE EXCEPTION 'Transfira a administração, encerre os vínculos e quite as dívidas antes de excluir a conta' USING ERRCODE = 'RH001';
    END IF;
  END IF;
  RETURN NULL;
END; $$;

COMMIT;
