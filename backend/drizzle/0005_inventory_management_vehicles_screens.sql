-- Migration: Inventory Management - Vehicles & Screens Enhancement
-- Phase 4: Proper Inventory Management

-- 1. Update vehicles table structure
-- First, add new columns
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS license_plate TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS make_model TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Migrate existing data if columns exist
UPDATE vehicles SET name = COALESCE(identifier, 'Vehicle-' || id) WHERE name IS NULL;
UPDATE vehicles SET license_plate = licence_plate WHERE license_plate IS NULL AND licence_plate IS NOT NULL;
UPDATE vehicles SET make_model = CONCAT_WS(' ', make, model) WHERE make_model IS NULL AND (make IS NOT NULL OR model IS NOT NULL);

-- Make name required (NOT NULL) after migration
ALTER TABLE vehicles ALTER COLUMN name SET NOT NULL;

-- 2. Update screens table - add new columns
ALTER TABLE screens ADD COLUMN IF NOT EXISTS width_px INTEGER NOT NULL DEFAULT 342;
ALTER TABLE screens ADD COLUMN IF NOT EXISTS height_px INTEGER NOT NULL DEFAULT 130;
ALTER TABLE screens ADD COLUMN IF NOT EXISTS orientation VARCHAR(20) NOT NULL DEFAULT 'landscape';
ALTER TABLE screens ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Copy resolution values to new fields
UPDATE screens SET width_px = resolution_width WHERE width_px = 342;
UPDATE screens SET height_px = resolution_height WHERE height_px = 130;

-- Update screen_type to have proper default
ALTER TABLE screens ALTER COLUMN screen_type SET DEFAULT 'vehicle';

-- 3. Handle vehicle_id column type change (text to uuid)
-- First clear existing vehicle references (since old vehicles table had text ids)
UPDATE screens SET vehicle_id = NULL WHERE vehicle_id IS NOT NULL;

-- Create indexes for vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_publisher_org_id ON vehicles(publisher_org_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON vehicles(is_active);

-- Create indexes for screens new fields
CREATE INDEX IF NOT EXISTS idx_screens_is_active ON screens(is_active);
CREATE INDEX IF NOT EXISTS idx_screens_screen_type ON screens(screen_type);
CREATE INDEX IF NOT EXISTS idx_screens_orientation ON screens(orientation);
