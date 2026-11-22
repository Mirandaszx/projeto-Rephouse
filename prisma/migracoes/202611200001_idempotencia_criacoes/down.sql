-- Referência para uma migration compensatória. Nunca remover histórico de operações.
BEGIN;
SET LOCAL lock_timeout = '2s';
-- Impede inserir histórico entre a conferência de vazio e a remoção da estrutura.
LOCK TABLE operacoes_criacao IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM operacoes_criacao) THEN
    RAISE EXCEPTION 'Reversao recusada: preserve o historico de criacoes';
  END IF;
END $$;
DROP TABLE operacoes_criacao;
DROP FUNCTION validar_operacao_criacao();
COMMIT;
