-- Não remover provas de confirmação nem solicitações que ainda possuem utilidade.
BEGIN;
LOCK TABLE emails_verificados, links_email, limites_envio_email IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM emails_verificados) OR EXISTS (SELECT 1 FROM links_email)
    OR EXISTS (SELECT 1 FROM limites_envio_email) THEN
    RAISE EXCEPTION 'Reversão recusada: preserve o histórico de autenticação e faça rollback da aplicação sem remover estas tabelas.';
  END IF;
END $$;
DROP TABLE links_email, emails_verificados, limites_envio_email;
COMMIT;
