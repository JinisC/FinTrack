-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('up', 'degraded', 'down');

-- CreateTable
CREATE TABLE "health_checks" (
    "id" BIGSERIAL NOT NULL,
    "target" TEXT NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "CheckStatus" NOT NULL,
    "response_time_ms" INTEGER,
    "http_status" INTEGER,
    "error" TEXT,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" UUID NOT NULL,
    "target" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "cause" TEXT NOT NULL,
    "alert_sent_at" TIMESTAMP(3),
    "resolved_alert_sent_at" TIMESTAMP(3),

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "health_checks_target_checked_at_idx" ON "health_checks"("target", "checked_at");

-- CreateIndex
CREATE INDEX "incidents_target_started_at_idx" ON "incidents"("target", "started_at");
