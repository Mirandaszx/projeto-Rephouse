BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Regras adicionais: nenhum registro é corrigido ou removido.
ALTER TABLE configuracoes_recorrencia ADD CONSTRAINT aud_configuracoes_versao CHECK (versao > 0) NOT VALID;
ALTER TABLE configuracoes_recorrencia VALIDATE CONSTRAINT aud_configuracoes_versao;

ALTER TABLE competencias_recorrencia ADD CONSTRAINT aud_competencias_revisao_par CHECK ((revisada_em IS NULL) = (revisada_por_id IS NULL)) NOT VALID;
ALTER TABLE competencias_recorrencia VALIDATE CONSTRAINT aud_competencias_revisao_par;

ALTER TABLE recorrencias_despesa ADD CONSTRAINT aud_recorrencias_pausa_motivo CHECK (pausa_motivo IS NULL OR pausa_motivo IN ('PARTICIPANTES_INATIVOS','REPUBLICA_OU_ADMIN_INATIVO')) NOT VALID;
ALTER TABLE recorrencias_despesa VALIDATE CONSTRAINT aud_recorrencias_pausa_motivo;

ALTER TABLE competencias_recorrencia ADD CONSTRAINT aud_competencias_motivo CHECK (motivo IS NULL OR motivo IN ('PERIODO_NAO_GERADO','PARTICIPANTES_INATIVOS','REPUBLICA_OU_ADMIN_INATIVO')) NOT VALID;
ALTER TABLE competencias_recorrencia VALIDATE CONSTRAINT aud_competencias_motivo;

COMMIT;
