BEGIN;
-- Não descartar silenciosamente limites de cobrança já configurados.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM recorrencias_despesa WHERE fim IS NOT NULL) THEN
    RAISE EXCEPTION 'Reversão bloqueada: existem recorrências com término definido. Preserve os limites e use uma versão compatível.';
  END IF;
END $$;
ALTER TABLE recorrencias_despesa DROP CONSTRAINT recorrencias_fim_valido;
ALTER TABLE recorrencias_despesa DROP COLUMN fim;
COMMIT;
