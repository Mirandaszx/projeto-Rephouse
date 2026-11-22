BEGIN;
ALTER TABLE tarefas ALTER COLUMN responsavel_id DROP NOT NULL;
ALTER TABLE tarefas ADD COLUMN criador_id uuid REFERENCES usuarios(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE tarefas ADD COLUMN versao integer NOT NULL DEFAULT 0 CHECK (versao >= 0);
ALTER TABLE tarefas ADD CONSTRAINT tarefa_concluida_responsavel_check CHECK (status <> 'CONCLUIDA' OR responsavel_id IS NOT NULL);
CREATE OR REPLACE FUNCTION validar_responsavel_tarefa() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.responsavel_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' OR NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id
    OR NEW.republica_id IS DISTINCT FROM OLD.republica_id THEN
    IF NOT EXISTS (SELECT 1 FROM membros_republica m JOIN usuarios u ON u.id=m.usuario_id
      WHERE m.id=NEW.responsavel_id AND m.republica_id=NEW.republica_id AND m.ativo AND u.ativo AND u.excluido_em IS NULL) THEN
      RAISE EXCEPTION 'O responsável da tarefa deve estar ativo na mesma república' USING ERRCODE='RH001';
    END IF;
  END IF;
  RETURN NEW;
END $$;
COMMIT;
