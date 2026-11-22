-- Referência para uma migration compensatória revisada; não executar automaticamente.
BEGIN;
LOCK TABLE tarefas IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM tarefas WHERE responsavel_id IS NULL OR criador_id IS NOT NULL OR versao<>0) THEN
   RAISE EXCEPTION 'Reversão recusada: preserve tarefas e autoria existentes';
 END IF;
 IF to_regclass('eventos_notificacao') IS NOT NULL THEN
   RAISE EXCEPTION 'Reverta primeiro a estrutura de notificações, sem remover histórico';
 END IF;
END $$;
ALTER TABLE tarefas DROP CONSTRAINT tarefa_concluida_responsavel_check;
ALTER TABLE tarefas ALTER COLUMN responsavel_id SET NOT NULL;
ALTER TABLE tarefas DROP COLUMN criador_id, DROP COLUMN versao;
CREATE OR REPLACE FUNCTION validar_responsavel_tarefa() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id OR NEW.republica_id IS DISTINCT FROM OLD.republica_id THEN
  IF NOT EXISTS(SELECT 1 FROM membros_republica m JOIN usuarios u ON u.id=m.usuario_id WHERE m.id=NEW.responsavel_id AND m.republica_id=NEW.republica_id AND m.ativo AND u.ativo AND u.excluido_em IS NULL) THEN
   RAISE EXCEPTION 'O responsável da tarefa deve estar ativo na mesma república' USING ERRCODE='RH001';
  END IF;
 END IF;
 RETURN NEW;
END $$;
COMMIT;
