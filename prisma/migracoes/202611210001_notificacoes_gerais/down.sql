BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM eventos_notificacao WHERE categoria='GERAIS') THEN
  RAISE EXCEPTION 'Reversão recusada: preserve os eventos gerais existentes';
 END IF;
END $$;
ALTER TABLE eventos_notificacao DROP CONSTRAINT eventos_notificacao_check;
ALTER TABLE eventos_notificacao DROP COLUMN membro_evento_id;
ALTER TABLE eventos_notificacao ADD CONSTRAINT eventos_notificacao_check CHECK ((categoria='TAREFAS' AND tipo IN ('TAREFA_CRIADA','TAREFA_ASSUMIDA','TAREFA_REATRIBUIDA','TAREFA_CONCLUIDA','TAREFA_LIBERADA','TAREFA_REABERTA')
   AND tarefa_id IS NOT NULL AND tarefa_versao IS NOT NULL AND ator_id IS NOT NULL AND rateio_id IS NULL AND vencimento IS NULL)
 OR (categoria='DESPESAS' AND tipo IN ('DESPESA_PROXIMA','DESPESA_VENCE_HOJE')
   AND rateio_id IS NOT NULL AND vencimento IS NOT NULL AND tarefa_id IS NULL AND tarefa_versao IS NULL AND ator_id IS NULL));
CREATE OR REPLACE FUNCTION validar_evento_notificacao() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.tarefa_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM tarefas WHERE id=NEW.tarefa_id AND republica_id=NEW.republica_id AND versao=NEW.tarefa_versao) THEN
   RAISE EXCEPTION 'Evento de tarefa inválido' USING ERRCODE='RH001';
 END IF;
 IF NEW.rateio_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM rateios_despesa r JOIN despesas d ON d.id=r.despesa_id WHERE r.id=NEW.rateio_id AND d.republica_id=NEW.republica_id AND d.vencimento=NEW.vencimento) THEN
   RAISE EXCEPTION 'Evento financeiro inválido' USING ERRCODE='RH001';
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION validar_destinatario_notificacao() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM eventos_notificacao e JOIN membros_republica m ON m.republica_id=e.republica_id
   JOIN usuarios u ON u.id=m.usuario_id WHERE e.id=NEW.evento_id AND m.id=NEW.membro_id AND m.ativo AND u.ativo AND u.excluido_em IS NULL
   AND (e.ator_id IS NULL OR e.ator_id<>u.id)
   AND (e.rateio_id IS NULL OR EXISTS(SELECT 1 FROM rateios_despesa r WHERE r.id=e.rateio_id AND r.membro_id=m.id))) THEN
   RAISE EXCEPTION 'Destinatário inválido' USING ERRCODE='RH001';
 END IF;
 RETURN NEW;
END $$;

COMMIT;
