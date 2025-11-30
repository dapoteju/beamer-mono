-- Migration: Add public codes for human-readable entity identifiers
-- Publishers get PUB-00001, Advertisers get ADV-00001

-- Step 1: Add nullable public_code columns
ALTER TABLE publisher_profiles
  ADD COLUMN IF NOT EXISTS public_code TEXT;

ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS public_code TEXT;

-- Step 2: Backfill publisher_profiles with PUB-XXXXX codes
DO $$
DECLARE
  r RECORD;
  counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM publisher_profiles WHERE public_code IS NULL ORDER BY created_at LOOP
    counter := counter + 1;
    UPDATE publisher_profiles SET public_code = 'PUB-' || LPAD(counter::text, 5, '0') WHERE id = r.id;
  END LOOP;
END $$;

-- Step 3: Backfill organisations with ADV-XXXXX codes for advertisers
DO $$
DECLARE
  r RECORD;
  counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM organisations WHERE organisation_category = 'advertiser' AND public_code IS NULL ORDER BY created_at LOOP
    counter := counter + 1;
    UPDATE organisations SET public_code = 'ADV-' || LPAD(counter::text, 5, '0') WHERE id = r.id;
  END LOOP;
END $$;

-- Step 4: Backfill organisations with ORG-PUB-XXXXX codes for publisher orgs
DO $$
DECLARE
  r RECORD;
  counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM organisations WHERE organisation_category = 'publisher' AND public_code IS NULL ORDER BY created_at LOOP
    counter := counter + 1;
    UPDATE organisations SET public_code = 'ORG-PUB-' || LPAD(counter::text, 5, '0') WHERE id = r.id;
  END LOOP;
END $$;

-- Step 5: Backfill organisations with ORG-INT-XXXXX codes for beamer_internal orgs
DO $$
DECLARE
  r RECORD;
  counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM organisations WHERE organisation_category = 'beamer_internal' AND public_code IS NULL ORDER BY created_at LOOP
    counter := counter + 1;
    UPDATE organisations SET public_code = 'ORG-INT-' || LPAD(counter::text, 5, '0') WHERE id = r.id;
  END LOOP;
END $$;

-- Step 6: Make public_code NOT NULL and add unique constraints for publisher_profiles
ALTER TABLE publisher_profiles
  ALTER COLUMN public_code SET NOT NULL;

ALTER TABLE publisher_profiles
  ADD CONSTRAINT publisher_profiles_public_code_unique UNIQUE (public_code);

-- Step 7: Add unique constraint for organisations (nullable, so no NOT NULL constraint)
ALTER TABLE organisations
  ADD CONSTRAINT organisations_public_code_unique UNIQUE (public_code);
