-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingCycle" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "nextBillingDate" DATETIME NOT NULL,
    "category" TEXT,
    "notes" TEXT,
    "trialEndDate" DATETIME,
    "trialPrice" REAL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "utilityStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastUsedAt" DATETIME,
    "utilityStatusUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Subscription" ("billingCycle", "category", "createdAt", "currency", "id", "isActive", "isArchived", "isFavorite", "name", "nextBillingDate", "notes", "price", "startDate", "trialEndDate", "trialPrice", "updatedAt", "userId") SELECT "billingCycle", "category", "createdAt", "currency", "id", "isActive", "isArchived", "isFavorite", "name", "nextBillingDate", "notes", "price", "startDate", "trialEndDate", "trialPrice", "updatedAt", "userId" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
