BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Retira apenas as garantias desta migration; preserva os dados e regras anteriores.
ALTER TABLE despesas DROP CONSTRAINT aud_despesas_vencimento_finito;
ALTER TABLE tarefas DROP CONSTRAINT aud_tarefas_prazo_finito;
ALTER TABLE recorrencias_despesa DROP CONSTRAINT aud_recorrencias_despesa_inicio_finito;
ALTER TABLE recorrencias_despesa DROP CONSTRAINT aud_recorrencias_despesa_proxima_competencia_finito;
ALTER TABLE configuracoes_recorrencia DROP CONSTRAINT aud_configuracoes_recorrencia_vigencia_finito;
ALTER TABLE competencias_recorrencia DROP CONSTRAINT aud_competencias_recorrencia_competencia_finito;

COMMIT;
