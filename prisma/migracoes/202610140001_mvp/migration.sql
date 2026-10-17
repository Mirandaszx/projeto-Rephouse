-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('USUARIO_NORMAL', 'USUARIO_ADMIN', 'USUARIO_MASTER');

-- CreateEnum
CREATE TYPE "StatusDespesa" AS ENUM ('PENDENTE', 'PAGA');

-- CreateEnum
CREATE TYPE "StatusRateio" AS ENUM ('PENDENTE', 'PAGO');

-- CreateEnum
CREATE TYPE "StatusTarefa" AS ENUM ('ABERTA', 'CONCLUIDA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "tipo_usuario" "TipoUsuario" NOT NULL DEFAULT 'USUARIO_NORMAL',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "republicas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR(120) NOT NULL,
    "codigo_entrada" VARCHAR(32) NOT NULL,
    "admin_id" UUID NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "republicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membros_republica" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "republica_id" UUID NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "entrou_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membros_republica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despesas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "republica_id" UUID NOT NULL,
    "criada_por_id" UUID NOT NULL,
    "titulo" VARCHAR(160) NOT NULL,
    "categoria" VARCHAR(80) NOT NULL,
    "valor_total" DECIMAL(12,2) NOT NULL,
    "vencimento" DATE NOT NULL,
    "status" "StatusDespesa" NOT NULL DEFAULT 'PENDENTE',
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "despesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rateios_despesa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "despesa_id" UUID NOT NULL,
    "membro_id" UUID NOT NULL,
    "valor_devido" DECIMAL(12,2) NOT NULL,
    "valor_pago" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "StatusRateio" NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "rateios_despesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rateio_id" UUID NOT NULL,
    "membro_id" UUID NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "comprovante_url" VARCHAR(500),
    "data_pagamento" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "republica_id" UUID NOT NULL,
    "responsavel_id" UUID NOT NULL,
    "titulo" VARCHAR(160) NOT NULL,
    "descricao" TEXT,
    "prazo" DATE,
    "status" "StatusTarefa" NOT NULL DEFAULT 'ABERTA',
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "republicas_codigo_entrada_key" ON "republicas"("codigo_entrada");

-- CreateIndex
CREATE INDEX "republicas_admin_id_idx" ON "republicas"("admin_id");

-- CreateIndex
CREATE INDEX "membros_republica_republica_id_ativo_idx" ON "membros_republica"("republica_id", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "membros_republica_usuario_id_republica_id_key" ON "membros_republica"("usuario_id", "republica_id");

-- CreateIndex
CREATE INDEX "despesas_republica_id_status_vencimento_idx" ON "despesas"("republica_id", "status", "vencimento");

-- CreateIndex
CREATE INDEX "despesas_criada_por_id_idx" ON "despesas"("criada_por_id");

-- CreateIndex
CREATE INDEX "rateios_despesa_membro_id_status_idx" ON "rateios_despesa"("membro_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "rateios_despesa_despesa_id_membro_id_key" ON "rateios_despesa"("despesa_id", "membro_id");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_rateio_id_key" ON "pagamentos"("rateio_id");

-- CreateIndex
CREATE INDEX "pagamentos_membro_id_data_pagamento_idx" ON "pagamentos"("membro_id", "data_pagamento");

-- CreateIndex
CREATE INDEX "tarefas_republica_id_status_prazo_idx" ON "tarefas"("republica_id", "status", "prazo");

-- CreateIndex
CREATE INDEX "tarefas_responsavel_id_status_idx" ON "tarefas"("responsavel_id", "status");

-- AddForeignKey
ALTER TABLE "republicas" ADD CONSTRAINT "republicas_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "membros_republica" ADD CONSTRAINT "membros_republica_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "membros_republica" ADD CONSTRAINT "membros_republica_republica_id_fkey" FOREIGN KEY ("republica_id") REFERENCES "republicas"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_republica_id_fkey" FOREIGN KEY ("republica_id") REFERENCES "republicas"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_criada_por_id_fkey" FOREIGN KEY ("criada_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "rateios_despesa" ADD CONSTRAINT "rateios_despesa_despesa_id_fkey" FOREIGN KEY ("despesa_id") REFERENCES "despesas"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "rateios_despesa" ADD CONSTRAINT "rateios_despesa_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros_republica"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_rateio_id_fkey" FOREIGN KEY ("rateio_id") REFERENCES "rateios_despesa"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros_republica"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_republica_id_fkey" FOREIGN KEY ("republica_id") REFERENCES "republicas"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "membros_republica"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
