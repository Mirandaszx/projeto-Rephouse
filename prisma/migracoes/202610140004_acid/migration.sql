BEGIN;

-- Somente o banco que recebe a migration: não altera outros bancos do servidor.
-- Os padrões passam a valer para novas conexões, inclusive fora do Prisma.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET default_transaction_isolation = %L',
    current_database(), 'serializable');
  EXECUTE format('ALTER DATABASE %I SET synchronous_commit = %L',
    current_database(), 'on');
END;
$$;

COMMIT;
