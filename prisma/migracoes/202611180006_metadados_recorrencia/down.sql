BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Retira apenas as garantias desta migration; preserva os dados e regras anteriores.
ALTER TABLE configuracoes_recorrencia DROP CONSTRAINT aud_configuracoes_versao;
ALTER TABLE competencias_recorrencia DROP CONSTRAINT aud_competencias_revisao_par;
ALTER TABLE recorrencias_despesa DROP CONSTRAINT aud_recorrencias_pausa_motivo;
ALTER TABLE competencias_recorrencia DROP CONSTRAINT aud_competencias_motivo;

COMMIT;
