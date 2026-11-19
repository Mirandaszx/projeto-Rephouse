BEGIN;
SET LOCAL lock_timeout = '2s';
CREATE OR REPLACE VIEW despesas_com_status AS SELECT d.*,
  CASE WHEN d.status = 'PAGA' THEN 'PAGA'
    WHEN d.vencimento < (now() AT TIME ZONE 'America/Fortaleza')::date THEN 'VENCIDA'
    ELSE 'PENDENTE' END AS status_calculado
FROM despesas d;
COMMIT;
