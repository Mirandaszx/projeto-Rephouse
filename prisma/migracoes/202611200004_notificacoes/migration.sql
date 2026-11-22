BEGIN;
CREATE TABLE eventos_notificacao (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), republica_id uuid NOT NULL REFERENCES republicas(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 categoria varchar(10) NOT NULL, tipo varchar(32) NOT NULL, titulo varchar(160) NOT NULL CHECK (btrim(titulo)<>''),
 ator_id uuid REFERENCES usuarios(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 tarefa_id uuid REFERENCES tarefas(id) ON UPDATE RESTRICT ON DELETE RESTRICT, tarefa_versao integer CHECK(tarefa_versao>=0),
 rateio_id uuid REFERENCES rateios_despesa(id) ON UPDATE RESTRICT ON DELETE RESTRICT, vencimento date CHECK(isfinite(vencimento)),
 criado_em timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT eventos_tarefa_versao_tipo_key UNIQUE(tarefa_id,tarefa_versao,tipo),
 CONSTRAINT eventos_rateio_vencimento_tipo_key UNIQUE(rateio_id,vencimento,tipo),
 CHECK ((categoria='TAREFAS' AND tipo IN ('TAREFA_CRIADA','TAREFA_ASSUMIDA','TAREFA_REATRIBUIDA','TAREFA_CONCLUIDA','TAREFA_LIBERADA','TAREFA_REABERTA')
   AND tarefa_id IS NOT NULL AND tarefa_versao IS NOT NULL AND ator_id IS NOT NULL AND rateio_id IS NULL AND vencimento IS NULL)
 OR (categoria='DESPESAS' AND tipo IN ('DESPESA_PROXIMA','DESPESA_VENCE_HOJE')
   AND rateio_id IS NOT NULL AND vencimento IS NOT NULL AND tarefa_id IS NULL AND tarefa_versao IS NULL AND ator_id IS NULL))
);
CREATE INDEX eventos_notificacao_republica_id_criado_em_idx ON eventos_notificacao(republica_id,criado_em);
CREATE TABLE notificacoes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), evento_id uuid NOT NULL REFERENCES eventos_notificacao(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 membro_id uuid NOT NULL REFERENCES membros_republica(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 lida_em timestamptz(3), criado_em timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(evento_id,membro_id), CHECK(lida_em IS NULL OR lida_em>=criado_em)
);
CREATE INDEX notificacoes_membro_id_lida_em_criado_em_idx ON notificacoes(membro_id,lida_em,criado_em);
CREATE FUNCTION validar_evento_notificacao() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.tarefa_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM tarefas WHERE id=NEW.tarefa_id AND republica_id=NEW.republica_id AND versao=NEW.tarefa_versao) THEN
   RAISE EXCEPTION 'Evento de tarefa inválido' USING ERRCODE='RH001';
 END IF;
 IF NEW.rateio_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM rateios_despesa r JOIN despesas d ON d.id=r.despesa_id WHERE r.id=NEW.rateio_id AND d.republica_id=NEW.republica_id AND d.vencimento=NEW.vencimento) THEN
   RAISE EXCEPTION 'Evento financeiro inválido' USING ERRCODE='RH001';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER evento_notificacao_integridade BEFORE INSERT ON eventos_notificacao FOR EACH ROW EXECUTE FUNCTION validar_evento_notificacao();
CREATE FUNCTION validar_destinatario_notificacao() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM eventos_notificacao e JOIN membros_republica m ON m.republica_id=e.republica_id
   JOIN usuarios u ON u.id=m.usuario_id WHERE e.id=NEW.evento_id AND m.id=NEW.membro_id AND m.ativo AND u.ativo AND u.excluido_em IS NULL
   AND (e.ator_id IS NULL OR e.ator_id<>u.id)
   AND (e.rateio_id IS NULL OR EXISTS(SELECT 1 FROM rateios_despesa r WHERE r.id=e.rateio_id AND r.membro_id=m.id))) THEN
   RAISE EXCEPTION 'Destinatário inválido' USING ERRCODE='RH001';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER notificacao_destinatario_integridade BEFORE INSERT ON notificacoes FOR EACH ROW EXECUTE FUNCTION validar_destinatario_notificacao();
CREATE FUNCTION sinalizar_notificacoes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_notify('rephouse_notificacoes','');
 RETURN NULL;
END $$;
CREATE TRIGGER notificacoes_sinalizar AFTER INSERT OR UPDATE ON notificacoes FOR EACH STATEMENT EXECUTE FUNCTION sinalizar_notificacoes();
CREATE TRIGGER rateios_sinalizar_notificacoes AFTER UPDATE ON rateios_despesa FOR EACH STATEMENT EXECUTE FUNCTION sinalizar_notificacoes();
CREATE TRIGGER despesas_sinalizar_notificacoes AFTER UPDATE ON despesas FOR EACH STATEMENT EXECUTE FUNCTION sinalizar_notificacoes();
COMMIT;
