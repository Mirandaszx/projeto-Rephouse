BEGIN;

-- CreateTable
CREATE TABLE "recorrencias_despesa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "republica_id" UUID NOT NULL,
    "criada_por_id" UUID NOT NULL,
    "despesa_origem_id" UUID,
    "inicio" DATE NOT NULL,
    "proxima_competencia" DATE NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "pausa_motivo" VARCHAR(60),
    "chave_idempotencia" UUID NOT NULL,
    "hash_requisicao" CHAR(64) NOT NULL,
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recorrencias_despesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes_recorrencia" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "versao" SERIAL NOT NULL UNIQUE,
    "recorrencia_id" UUID NOT NULL,
    "vigencia" DATE NOT NULL,
    "titulo" VARCHAR(160) NOT NULL,
    "categoria" VARCHAR(80) NOT NULL,
    "valor_total" DECIMAL(12,2) NOT NULL,
    "dia_vencimento" INTEGER NOT NULL,
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracoes_recorrencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recorrencias_participantes" (
    "configuracao_id" UUID NOT NULL,
    "membro_id" UUID NOT NULL,

    CONSTRAINT "recorrencias_participantes_pkey" PRIMARY KEY ("configuracao_id","membro_id")
);

-- CreateTable
CREATE TABLE "competencias_recorrencia" (
    "recorrencia_id" UUID NOT NULL,
    "competencia" DATE NOT NULL,
    "configuracao_id" UUID,
    "despesa_id" UUID,
    "estado" VARCHAR(24) NOT NULL,
    "motivo" VARCHAR(60),
    "snapshot" JSONB,
    "revisada_por_id" UUID,
    "revisada_em" TIMESTAMPTZ(3),

    CONSTRAINT "competencias_recorrencia_pkey" PRIMARY KEY ("recorrencia_id","competencia")
);

-- CreateIndex
CREATE UNIQUE INDEX "recorrencias_despesa_despesa_origem_id_key" ON "recorrencias_despesa"("despesa_origem_id");

-- CreateIndex
CREATE UNIQUE INDEX "recorrencias_despesa_chave_idempotencia_key" ON "recorrencias_despesa"("chave_idempotencia");

-- CreateIndex
CREATE INDEX "recorrencias_despesa_ativa_pausa_motivo_proxima_competencia_idx" ON "recorrencias_despesa"("ativa", "pausa_motivo", "proxima_competencia");

-- CreateIndex
CREATE INDEX "recorrencias_despesa_republica_id_criada_em_idx" ON "recorrencias_despesa"("republica_id", "criada_em");

-- CreateIndex
CREATE INDEX "configuracoes_recorrencia_recorrencia_id_vigencia_criada_em_idx" ON "configuracoes_recorrencia"("recorrencia_id", "vigencia", "criada_em");

-- CreateIndex
CREATE INDEX "recorrencias_participantes_membro_id_idx" ON "recorrencias_participantes"("membro_id");

-- CreateIndex
CREATE UNIQUE INDEX "competencias_recorrencia_despesa_id_key" ON "competencias_recorrencia"("despesa_id");

-- CreateIndex
CREATE INDEX "competencias_recorrencia_estado_competencia_idx" ON "competencias_recorrencia"("estado", "competencia");

-- AddForeignKey
ALTER TABLE "recorrencias_despesa" ADD CONSTRAINT "recorrencias_despesa_republica_id_fkey" FOREIGN KEY ("republica_id") REFERENCES "republicas"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "recorrencias_despesa" ADD CONSTRAINT "recorrencias_despesa_criada_por_id_fkey" FOREIGN KEY ("criada_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "recorrencias_despesa" ADD CONSTRAINT "recorrencias_despesa_despesa_origem_id_fkey" FOREIGN KEY ("despesa_origem_id") REFERENCES "despesas"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "configuracoes_recorrencia" ADD CONSTRAINT "configuracoes_recorrencia_recorrencia_id_fkey" FOREIGN KEY ("recorrencia_id") REFERENCES "recorrencias_despesa"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "recorrencias_participantes" ADD CONSTRAINT "recorrencias_participantes_configuracao_id_fkey" FOREIGN KEY ("configuracao_id") REFERENCES "configuracoes_recorrencia"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "recorrencias_participantes" ADD CONSTRAINT "recorrencias_participantes_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros_republica"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "competencias_recorrencia" ADD CONSTRAINT "competencias_recorrencia_recorrencia_id_fkey" FOREIGN KEY ("recorrencia_id") REFERENCES "recorrencias_despesa"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "competencias_recorrencia" ADD CONSTRAINT "competencias_recorrencia_configuracao_id_fkey" FOREIGN KEY ("configuracao_id") REFERENCES "configuracoes_recorrencia"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "competencias_recorrencia" ADD CONSTRAINT "competencias_recorrencia_despesa_id_fkey" FOREIGN KEY ("despesa_id") REFERENCES "despesas"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "competencias_recorrencia" ADD CONSTRAINT "competencias_recorrencia_revisada_por_id_fkey" FOREIGN KEY ("revisada_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE recorrencias_despesa ADD CONSTRAINT recorrencia_meses_validos CHECK (
  extract(day FROM inicio) = 1 AND extract(day FROM proxima_competencia) = 1 AND proxima_competencia >= inicio);
ALTER TABLE configuracoes_recorrencia ADD CONSTRAINT configuracao_valida CHECK (
  extract(day FROM vigencia) = 1 AND dia_vencimento BETWEEN 1 AND 31 AND valor_total > 0);
ALTER TABLE competencias_recorrencia ADD CONSTRAINT competencia_valida CHECK (
  extract(day FROM competencia) = 1 AND estado IN ('GERADA','PENDENTE_REVISAO','BLOQUEADA','REVISADA')
  AND ((estado = 'GERADA') = (despesa_id IS NOT NULL))
  AND ((estado = 'REVISADA') = (revisada_em IS NOT NULL AND revisada_por_id IS NOT NULL))
  AND (estado <> 'GERADA' OR (configuracao_id IS NOT NULL AND snapshot IS NOT NULL)));

CREATE FUNCTION validar_vinculo_recorrencia() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'recorrencias_despesa' THEN
    IF TG_OP = 'UPDATE' AND (NEW.republica_id,NEW.criada_por_id,NEW.inicio,NEW.despesa_origem_id,NEW.chave_idempotencia,NEW.hash_requisicao)
      IS DISTINCT FROM (OLD.republica_id,OLD.criada_por_id,OLD.inicio,OLD.despesa_origem_id,OLD.chave_idempotencia,OLD.hash_requisicao) THEN
      RAISE EXCEPTION 'A identidade da recorrência é permanente' USING ERRCODE='RH001';
    END IF;
    IF NEW.despesa_origem_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM despesas d WHERE d.id=NEW.despesa_origem_id AND d.republica_id=NEW.republica_id) THEN
      RAISE EXCEPTION 'Origem de outra república' USING ERRCODE='RH001';
    END IF;
  ELSIF TG_TABLE_NAME = 'recorrencias_participantes' THEN
    IF NOT EXISTS (SELECT 1 FROM configuracoes_recorrencia c JOIN recorrencias_despesa r ON r.id=c.recorrencia_id
      JOIN membros_republica m ON m.republica_id=r.republica_id JOIN usuarios u ON u.id=m.usuario_id
      WHERE c.id=NEW.configuracao_id AND m.id=NEW.membro_id AND m.ativo AND u.ativo AND u.excluido_em IS NULL) THEN
      RAISE EXCEPTION 'Participante inválido na recorrência' USING ERRCODE='RH001';
    END IF;
    IF EXISTS (SELECT 1 FROM competencias_recorrencia WHERE configuracao_id=NEW.configuracao_id) THEN
      RAISE EXCEPTION 'Configuração utilizada é histórica' USING ERRCODE='RH001';
    END IF;
  ELSE
    IF TG_OP = 'UPDATE' AND (OLD.estado NOT IN ('PENDENTE_REVISAO','BLOQUEADA') OR NEW.estado <> 'REVISADA'
      OR (NEW.recorrencia_id,NEW.competencia,NEW.configuracao_id,NEW.despesa_id,NEW.snapshot,NEW.motivo)
      IS DISTINCT FROM (OLD.recorrencia_id,OLD.competencia,OLD.configuracao_id,OLD.despesa_id,OLD.snapshot,OLD.motivo)) THEN
      RAISE EXCEPTION 'Competências geradas são históricas' USING ERRCODE='RH001';
    END IF;
    IF NEW.configuracao_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM configuracoes_recorrencia c
      WHERE c.id=NEW.configuracao_id AND c.recorrencia_id=NEW.recorrencia_id AND c.vigencia<=NEW.competencia) THEN
      RAISE EXCEPTION 'Configuração de outra recorrência ou competência' USING ERRCODE='RH001';
    END IF;
    IF NEW.despesa_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM despesas d JOIN recorrencias_despesa r ON r.republica_id=d.republica_id
      WHERE d.id=NEW.despesa_id AND r.id=NEW.recorrencia_id AND date_trunc('month',d.vencimento)::date=NEW.competencia) THEN
      RAISE EXCEPTION 'Despesa de outra república ou competência' USING ERRCODE='RH001';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER recorrencia_vinculo BEFORE INSERT OR UPDATE ON recorrencias_despesa FOR EACH ROW EXECUTE FUNCTION validar_vinculo_recorrencia();
CREATE TRIGGER recorrencia_participante_vinculo BEFORE INSERT ON recorrencias_participantes FOR EACH ROW EXECUTE FUNCTION validar_vinculo_recorrencia();
CREATE TRIGGER competencia_vinculo BEFORE INSERT OR UPDATE ON competencias_recorrencia FOR EACH ROW EXECUTE FUNCTION validar_vinculo_recorrencia();

CREATE FUNCTION validar_selecao_recorrencia() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE alvo uuid; quantidade integer; valor numeric;
BEGIN
  IF TG_TABLE_NAME='configuracoes_recorrencia' THEN alvo:=NEW.id; ELSE alvo:=NEW.configuracao_id; END IF;
  SELECT c.valor_total,count(p.membro_id) INTO valor,quantidade FROM configuracoes_recorrencia c
    LEFT JOIN recorrencias_participantes p ON p.configuracao_id=c.id WHERE c.id=alvo GROUP BY c.valor_total;
  IF quantidade=0 OR valor < quantidade * 0.01 THEN
    RAISE EXCEPTION 'Seleção deve permitir rateio igualitário positivo' USING ERRCODE='RH001';
  END IF;
  RETURN NULL;
END; $$;
CREATE CONSTRAINT TRIGGER configuracao_selecao AFTER INSERT ON configuracoes_recorrencia DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validar_selecao_recorrencia();
CREATE CONSTRAINT TRIGGER participantes_selecao AFTER INSERT ON recorrencias_participantes DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validar_selecao_recorrencia();

CREATE FUNCTION preservar_configuracao_recorrente() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Crie uma nova configuração; preserve o histórico' USING ERRCODE='RH001'; END; $$;
CREATE TRIGGER configuracoes_historico BEFORE UPDATE OR DELETE ON configuracoes_recorrencia FOR EACH ROW EXECUTE FUNCTION preservar_configuracao_recorrente();
CREATE TRIGGER participantes_historico BEFORE UPDATE OR DELETE ON recorrencias_participantes FOR EACH ROW EXECUTE FUNCTION preservar_configuracao_recorrente();
CREATE TRIGGER competencias_historico BEFORE DELETE ON competencias_recorrencia FOR EACH ROW EXECUTE FUNCTION preservar_configuracao_recorrente();
CREATE INDEX despesas_competencia_idx ON despesas(vencimento,republica_id);
COMMIT;

