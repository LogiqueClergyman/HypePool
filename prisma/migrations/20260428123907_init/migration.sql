-- CreateEnum
CREATE TYPE "MarketStatus" AS ENUM ('ACTIVE', 'RESOLVED_YES', 'RESOLVED_NO', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MarketOutcome" AS ENUM ('YES', 'NO');

-- CreateEnum
CREATE TYPE "BetSide" AS ENUM ('YES', 'NO');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('BET', 'MARKET_CREATE', 'WITHDRAW');

-- CreateEnum
CREATE TYPE "InteractionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "stellar_address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custodial_wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "custodial_address" TEXT NOT NULL,
    "encrypted_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custodial_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL,
    "current_views" BIGINT NOT NULL,
    "last_fetched_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "markets" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "onchain_id" INTEGER NOT NULL,
    "contract_address" TEXT NOT NULL,
    "threshold" BIGINT NOT NULL,
    "window_hours" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "resolution_deadline" TIMESTAMP(3) NOT NULL,
    "min_bet" BIGINT NOT NULL,
    "yes_pool" BIGINT NOT NULL DEFAULT 0,
    "no_pool" BIGINT NOT NULL DEFAULT 0,
    "yes_weighted_pool" BIGINT NOT NULL DEFAULT 0,
    "no_weighted_pool" BIGINT NOT NULL DEFAULT 0,
    "total_bettors" INTEGER NOT NULL DEFAULT 0,
    "status" "MarketStatus" NOT NULL DEFAULT 'ACTIVE',
    "outcome" "MarketOutcome",
    "resolved_at" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "side" "BetSide" NOT NULL,
    "amount" BIGINT NOT NULL,
    "payout" BIGINT,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "tx_hash" TEXT NOT NULL,
    "claim_tx_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "user_address" TEXT NOT NULL,
    "market_id" TEXT,
    "xdr" TEXT NOT NULL,
    "status" "InteractionStatus" NOT NULL DEFAULT 'PENDING',
    "tx_hash" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_stellar_address_key" ON "users"("stellar_address");

-- CreateIndex
CREATE UNIQUE INDEX "custodial_wallets_user_id_key" ON "custodial_wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "custodial_wallets_custodial_address_key" ON "custodial_wallets"("custodial_address");

-- CreateIndex
CREATE UNIQUE INDEX "content_url_key" ON "content"("url");

-- CreateIndex
CREATE UNIQUE INDEX "content_platform_external_id_key" ON "content"("platform", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "markets_content_id_threshold_window_hours_key" ON "markets"("content_id", "threshold", "window_hours");

-- AddForeignKey
ALTER TABLE "custodial_wallets" ADD CONSTRAINT "custodial_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "markets" ADD CONSTRAINT "markets_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
