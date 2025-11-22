-- Idempotent migration to ensure userId column is removed from Link table
-- This migration is safe to run multiple times

-- Drop foreign key constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'Link_userId_fkey' 
    AND table_name = 'Link'
  ) THEN
    ALTER TABLE "Link" DROP CONSTRAINT "Link_userId_fkey";
  END IF;
END $$;

-- Drop index if it exists
DROP INDEX IF EXISTS "Link_userId_idx";

-- Drop column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'Link' 
    AND column_name = 'userId'
  ) THEN
    ALTER TABLE "Link" DROP COLUMN "userId";
  END IF;
END $$;

-- Drop User table if it exists (and is empty or safe to drop)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'User'
  ) THEN
    -- Check if table is empty before dropping
    IF NOT EXISTS (SELECT 1 FROM "User" LIMIT 1) THEN
      DROP TABLE "User";
    END IF;
  END IF;
END $$;

