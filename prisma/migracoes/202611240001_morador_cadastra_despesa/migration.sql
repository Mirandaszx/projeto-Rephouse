-- Qualquer morador ativo da própria república pode cadastrar despesas (decisão de 24/11/2026, Modo simples).
-- Mantém as demais garantias: usuário e república ativos, república imutável e valor travado após pagamento.
-- Quem pode corrigir (autor ou administrador) é verificado no serviço.
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
        AND (u.tipo_usuario = 'USUARIO_MASTER' OR EXISTS (
          SELECT 1 FROM membros_republica m
          WHERE m.usuario_id = u.id AND m.republica_id = r.id AND m.ativo
        ))
    ) THEN
      RAISE EXCEPTION 'A despesa exige morador ativo da própria república ou MASTER ativo' USING ERRCODE = 'RH001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
