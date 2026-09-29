-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "finance";

-- CreateTable
CREATE TABLE "finance"."users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."portfolio_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "coin_id" TEXT NOT NULL,
    "amount" DECIMAL(30,10) NOT NULL,
    "buy_price_usd" DECIMAL(30,10) NOT NULL,
    "bought_at" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "finance"."users"("email");

-- CreateIndex
CREATE INDEX "portfolio_entries_user_id_idx" ON "finance"."portfolio_entries"("user_id");

-- AddForeignKey
ALTER TABLE "finance"."portfolio_entries" ADD CONSTRAINT "portfolio_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "finance"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
