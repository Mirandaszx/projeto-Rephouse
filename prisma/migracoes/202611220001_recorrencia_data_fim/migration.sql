BEGIN;
-- Coluna opcional: recorrências anteriores continuam sem data limite.
ALTER TABLE recorrencias_despesa ADD COLUMN fim date;
ALTER TABLE recorrencias_despesa ADD CONSTRAINT recorrencias_fim_valido
  CHECK (fim IS NULL OR (isfinite(fim) AND fim >= inicio AND fim <= DATE '2199-12-31'));
COMMIT;
