-- AlterTable
ALTER TABLE "Pool" ADD COLUMN "actualViews" INTEGER;
ALTER TABLE "Pool" ADD COLUMN "creatorWallet" TEXT;
ALTER TABLE "Pool" ADD COLUMN "settlementTx" TEXT;

-- CreateTable
CREATE TABLE "ViewSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "poolId" TEXT NOT NULL,
    "views" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ViewSnapshot_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Stake" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "poolId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL DEFAULT 'anonymous',
    "amount" REAL NOT NULL,
    "position" TEXT NOT NULL DEFAULT 'yes',
    "rangeMin" REAL,
    "rangeMax" REAL,
    "multiplierEarned" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Stake_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Stake" ("amount", "createdAt", "id", "poolId", "position", "walletAddress") SELECT "amount", "createdAt", "id", "poolId", "position", "walletAddress" FROM "Stake";
DROP TABLE "Stake";
ALTER TABLE "new_Stake" RENAME TO "Stake";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
