BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Regras adicionais: nenhum registro é corrigido ou removido.
ALTER TABLE despesas ADD CONSTRAINT aud_despesas_vencimento_finito CHECK (isfinite(vencimento)) NOT VALID;
ALTER TABLE despesas VALIDATE CONSTRAINT aud_despesas_vencimento_finito;

ALTER TABLE tarefas ADD CONSTRAINT aud_tarefas_prazo_finito CHECK (isfinite(prazo)) NOT VALID;
ALTER TABLE tarefas VALIDATE CONSTRAINT aud_tarefas_prazo_finito;

ALTER TABLE recorrencias_despesa ADD CONSTRAINT aud_recorrencias_despesa_inicio_finito CHECK (isfinite(inicio)) NOT VALID;
ALTER TABLE recorrencias_despesa VALIDATE CONSTRAINT aud_recorrencias_despesa_inicio_finito;

ALTER TABLE recorrencias_despesa ADD CONSTRAINT aud_recorrencias_despesa_proxima_competencia_finito CHECK (isfinite(proxima_competencia)) NOT VALID;
ALTER TABLE recorrencias_despesa VALIDATE CONSTRAINT aud_recorrencias_despesa_proxima_competencia_finito;

ALTER TABLE configuracoes_recorrencia ADD CONSTRAINT aud_configuracoes_recorrencia_vigencia_finito CHECK (isfinite(vigencia)) NOT VALID;
ALTER TABLE configuracoes_recorrencia VALIDATE CONSTRAINT aud_configuracoes_recorrencia_vigencia_finito;

ALTER TABLE competencias_recorrencia ADD CONSTRAINT aud_competencias_recorrencia_competencia_finito CHECK (isfinite(competencia)) NOT VALID;
ALTER TABLE competencias_recorrencia VALIDATE CONSTRAINT aud_competencias_recorrencia_competencia_finito;

COMMIT;
