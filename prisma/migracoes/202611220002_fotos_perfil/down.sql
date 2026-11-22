BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM fotos_perfil) THEN
    RAISE EXCEPTION 'Reversão recusada: existem fotos. Preserve os dados antes de planejar a reversão.';
  END IF;
END $$;
DROP TABLE fotos_perfil;
COMMIT;
