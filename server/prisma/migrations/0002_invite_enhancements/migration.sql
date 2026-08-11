-- AlterTable: Add expiresAt, invitedById, acceptedAt to Invite
-- Step 1: Add columns as nullable first
ALTER TABLE "Invite" ADD COLUMN "invitedById" TEXT;
ALTER TABLE "Invite" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "Invite" ADD COLUMN "acceptedAt" TIMESTAMP(3);

-- Step 2: Set default expiresAt for existing rows (7 days from createdAt)
UPDATE "Invite" SET "expiresAt" = "createdAt" + INTERVAL '7 days' WHERE "expiresAt" IS NULL;

-- Step 3: Make expiresAt NOT NULL
ALTER TABLE "Invite" ALTER COLUMN "expiresAt" SET NOT NULL;

-- Step 4: Add foreign key for invitedById
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 5: Add index on token (already unique, but explicit for lookups)
-- (already covered by @unique constraint)
