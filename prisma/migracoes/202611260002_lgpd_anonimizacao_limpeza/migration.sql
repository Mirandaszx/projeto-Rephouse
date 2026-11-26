-- LGPD (26/11/2026): exclusão de conta passa a anonimizar os dados pessoais e registros vencidos são apagados.
-- A conta da API continua sem DELETE nessas tabelas (menor privilégio): ela só chama as duas funções abaixo,
-- que fazem exatamente isso e nada mais. Funções criadas pelo dono do schema (SECURITY DEFINER), com search_path
-- fixado no schema da migração e pg_temp por último, no fim deste arquivo.

-- Conta excluída não precisa de meio de acesso: a senha é apagada na anonimização.
CREATE OR REPLACE FUNCTION conferir_metodo_acesso() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE alvo uuid;
BEGIN
  IF TG_TABLE_NAME = 'usuarios' THEN
    alvo := COALESCE(NEW.id, OLD.id);
  ELSE
    alvo := OLD.usuario_id;
  END IF;
  PERFORM id FROM usuarios WHERE id = alvo FOR UPDATE;
  IF EXISTS (SELECT 1 FROM usuarios u WHERE u.id = alvo AND u.excluido_em IS NULL AND u.senha_hash IS NULL
      AND NOT EXISTS (SELECT 1 FROM identidades_google g WHERE g.usuario_id = u.id)) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Conta exige um método de acesso';
  END IF;
  RETURN NULL;
END $$;

-- Só age sobre conta JÁ excluída (excluido_em preenchido na mesma transação da exclusão). O histórico financeiro e
-- de tarefas continua, porque os outros moradores dependem dele, mas sem identificar a pessoa.
CREATE FUNCTION rephouse_anonimizar_conta_excluida(alvo uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE email_antigo text; nome_antigo text;
BEGIN
  SELECT email, nome INTO email_antigo, nome_antigo FROM usuarios WHERE id = alvo AND excluido_em IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'RH002', MESSAGE = 'Somente contas já excluídas podem ser anonimizadas.';
  END IF;
  DELETE FROM identidades_google WHERE usuario_id = alvo;
  DELETE FROM desafios_google WHERE usuario_id = alvo;
  DELETE FROM links_email WHERE usuario_id = alvo OR email = email_antigo;
  DELETE FROM emails_verificados WHERE usuario_id = alvo;
  DELETE FROM fotos_perfil WHERE usuario_id = alvo;
  DELETE FROM notificacoes WHERE membro_id IN (SELECT id FROM membros_republica WHERE usuario_id = alvo);
  -- Avisos de entrada e saída de morador guardam o nome da pessoa como título.
  UPDATE eventos_notificacao SET titulo = 'Ex-morador'
    WHERE titulo = nome_antigo AND membro_evento_id IN (SELECT id FROM membros_republica WHERE usuario_id = alvo);
  UPDATE usuarios SET nome = 'Ex-morador', senha_hash = NULL,
    email = 'excluido-' || replace(alvo::text, '-', '') || '@rephouse.invalid'
    WHERE id = alvo;
END $$;

-- Apaga o que só existe para autenticar e já venceu há mais de um dia. Devolve quantos registros saíram.
CREATE FUNCTION rephouse_limpar_dados_vencidos() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE total integer := 0; parcial integer;
BEGIN
  DELETE FROM links_email WHERE expira_em < CURRENT_TIMESTAMP - interval '1 day';
  GET DIAGNOSTICS parcial = ROW_COUNT; total := total + parcial;
  DELETE FROM desafios_google WHERE expira_em < CURRENT_TIMESTAMP - interval '1 day';
  GET DIAGNOSTICS parcial = ROW_COUNT; total := total + parcial;
  DELETE FROM limites_envio_email WHERE ultimo_envio < CURRENT_TIMESTAMP - interval '1 day';
  GET DIAGNOSTICS parcial = ROW_COUNT; total := total + parcial;
  RETURN total;
END $$;

-- search_path fixo no schema onde a migração roda (public em produção; schema isolado nos testes), pg_temp por último.
DO $$
BEGIN
  EXECUTE format('ALTER FUNCTION rephouse_anonimizar_conta_excluida(uuid) SET search_path = %I, pg_temp', current_schema());
  EXECUTE format('ALTER FUNCTION rephouse_limpar_dados_vencidos() SET search_path = %I, pg_temp', current_schema());
END $$;
