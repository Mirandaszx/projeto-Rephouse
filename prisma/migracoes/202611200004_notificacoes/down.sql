-- Referência para migration compensatória. Históricos não são descartáveis.
BEGIN;
LOCK TABLE notificacoes,eventos_notificacao IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM notificacoes) OR EXISTS(SELECT 1 FROM eventos_notificacao) THEN
  RAISE EXCEPTION 'Reversão recusada: existem eventos ou leituras a preservar';
 END IF;
END $$;
DROP TRIGGER rateios_sinalizar_notificacoes ON rateios_despesa;
DROP TRIGGER despesas_sinalizar_notificacoes ON despesas;
DROP TABLE notificacoes;
DROP TABLE eventos_notificacao;
DROP FUNCTION sinalizar_notificacoes();
DROP FUNCTION validar_evento_notificacao();
DROP FUNCTION validar_destinatario_notificacao();
COMMIT;
